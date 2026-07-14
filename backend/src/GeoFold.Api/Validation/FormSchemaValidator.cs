using System.Globalization;
using System.Text.Json;

namespace GeoFold.Api.Validation;

/// <summary>
/// A single field definition inside a project's <c>form_schema</c>.
/// </summary>
public sealed record FormFieldDef(string Key, string? Label, string Type, bool Required);

/// <summary>
/// Validates a project's <c>form_schema</c> and a survey's <c>form_data</c> against it.
/// Supported field types: text, number, integer, boolean, date, select.
/// </summary>
public static class FormSchemaValidator
{
    private static readonly HashSet<string> KnownTypes = new(StringComparer.OrdinalIgnoreCase)
    {
        "text", "string", "number", "integer", "boolean", "bool", "date", "select"
    };

    /// <summary>
    /// Parses and validates the schema JSON itself. Returns the parsed fields; <paramref name="errors"/>
    /// is non-empty when the schema is malformed (in which case the field list may be partial).
    /// </summary>
    public static IReadOnlyList<FormFieldDef> ParseSchema(string? schemaJson, out IReadOnlyList<string> errors)
    {
        var errorList = new List<string>();
        var fields = new List<FormFieldDef>();

        if (string.IsNullOrWhiteSpace(schemaJson))
        {
            errors = errorList;
            return fields;
        }

        JsonElement root;
        try
        {
            using var doc = JsonDocument.Parse(schemaJson);
            root = doc.RootElement.Clone();
        }
        catch (JsonException ex)
        {
            errorList.Add($"form_schema is not valid JSON: {ex.Message}");
            errors = errorList;
            return fields;
        }

        if (root.ValueKind != JsonValueKind.Array)
        {
            errorList.Add("form_schema must be a JSON array of field definitions.");
            errors = errorList;
            return fields;
        }

        var seenKeys = new HashSet<string>(StringComparer.Ordinal);
        var index = 0;
        foreach (var item in root.EnumerateArray())
        {
            if (item.ValueKind != JsonValueKind.Object)
            {
                errorList.Add($"form_schema[{index}] must be an object.");
                index++;
                continue;
            }

            var key = item.TryGetProperty("key", out var k) && k.ValueKind == JsonValueKind.String
                ? k.GetString()
                : null;
            var type = item.TryGetProperty("type", out var t) && t.ValueKind == JsonValueKind.String
                ? t.GetString()
                : null;
            var label = item.TryGetProperty("label", out var l) && l.ValueKind == JsonValueKind.String
                ? l.GetString()
                : null;
            var required = item.TryGetProperty("required", out var r)
                           && r.ValueKind is JsonValueKind.True or JsonValueKind.False
                           && r.GetBoolean();

            if (string.IsNullOrWhiteSpace(key))
                errorList.Add($"form_schema[{index}] is missing a non-empty string \"key\".");
            else if (!seenKeys.Add(key))
                errorList.Add($"form_schema[{index}] has duplicate key \"{key}\".");

            if (string.IsNullOrWhiteSpace(type))
                errorList.Add($"form_schema[{index}] (key \"{key}\") is missing a \"type\".");
            else if (!KnownTypes.Contains(type))
                errorList.Add($"form_schema[{index}] (key \"{key}\") has unsupported type \"{type}\".");

            if (key is not null && type is not null)
                fields.Add(new FormFieldDef(key, label, type, required));

            index++;
        }

        errors = errorList;
        return fields;
    }

    /// <summary>
    /// Validates survey <c>form_data</c> against a parsed schema. Enforces required fields and type matching.
    /// Unknown fields (present in data but not in schema) are ignored.
    /// </summary>
    public static IReadOnlyList<string> Validate(string? formDataJson, IReadOnlyList<FormFieldDef> schema)
    {
        var errors = new List<string>();

        // Nothing to enforce when the project defines no schema.
        if (schema.Count == 0)
            return errors;

        JsonElement root;
        if (string.IsNullOrWhiteSpace(formDataJson))
        {
            // No data at all: only fails if the schema has required fields.
            foreach (var field in schema)
                if (field.Required)
                    errors.Add($"Field \"{field.Key}\" is required.");
            return errors;
        }

        try
        {
            using var doc = JsonDocument.Parse(formDataJson);
            root = doc.RootElement.Clone();
        }
        catch (JsonException ex)
        {
            errors.Add($"form_data is not valid JSON: {ex.Message}");
            return errors;
        }

        if (root.ValueKind != JsonValueKind.Object)
        {
            errors.Add("form_data must be a JSON object.");
            return errors;
        }

        foreach (var field in schema)
        {
            var present = root.TryGetProperty(field.Key, out var value)
                          && value.ValueKind != JsonValueKind.Null;

            if (!present)
            {
                if (field.Required)
                    errors.Add($"Field \"{field.Key}\" is required.");
                continue;
            }

            // Treat an empty/whitespace string as missing for required checks.
            if (field.Required
                && value.ValueKind == JsonValueKind.String
                && string.IsNullOrWhiteSpace(value.GetString()))
            {
                errors.Add($"Field \"{field.Key}\" is required.");
                continue;
            }

            if (!TypeMatches(field.Type, value))
                errors.Add($"Field \"{field.Key}\" must be of type {field.Type}.");
        }

        return errors;
    }

    private static bool TypeMatches(string type, JsonElement value) => type.ToLowerInvariant() switch
    {
        "text" or "string" or "select" => value.ValueKind == JsonValueKind.String,
        "number" => value.ValueKind == JsonValueKind.Number,
        "integer" => value.ValueKind == JsonValueKind.Number && value.TryGetInt64(out _),
        "boolean" or "bool" => value.ValueKind is JsonValueKind.True or JsonValueKind.False,
        "date" => value.ValueKind == JsonValueKind.String && IsIsoDate(value.GetString()),
        _ => true // unknown types were already reported at schema-parse time; don't double-fail here.
    };

    private static bool IsIsoDate(string? s) =>
        !string.IsNullOrWhiteSpace(s)
        && DateTime.TryParse(s, CultureInfo.InvariantCulture, DateTimeStyles.RoundtripKind, out _);
}
