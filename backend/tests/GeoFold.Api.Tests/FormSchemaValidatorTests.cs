using GeoFold.Api.Validation;

namespace GeoFold.Api.Tests;

public class FormSchemaValidatorTests
{
    private const string RequiredText = """[{"key":"name","label":"Name","type":"text","required":true}]""";
    private const string OptionalText = """[{"key":"nick","type":"text","required":false}]""";

    private static int ErrorCount(string schema, string? data)
    {
        var fields = FormSchemaValidator.ParseSchema(schema, out _);
        return FormSchemaValidator.Validate(data, fields).Count;
    }

    private static IReadOnlyList<string> SchemaErrors(string? schema)
    {
        FormSchemaValidator.ParseSchema(schema, out var errors);
        return errors;
    }

    // ---- schema document itself ----

    [Fact]
    public void EmptySchemaIsValid() => Assert.Empty(SchemaErrors("[]"));

    [Theory]
    [InlineData("{}")]                                          // object, not an array
    [InlineData("not json")]                                    // unparseable
    [InlineData("""[{"label":"x","type":"text"}]""")]           // missing key
    [InlineData("""[{"key":"a","type":"weird"}]""")]            // unsupported type
    [InlineData("""[{"key":"a","type":"text"},{"key":"a","type":"number"}]""")] // duplicate key
    public void MalformedSchemaIsRejected(string schema) => Assert.NotEmpty(SchemaErrors(schema));

    // ---- no schema means nothing to enforce ----

    [Theory]
    [InlineData("""{"whatever":1}""")]
    [InlineData(null)]
    public void EmptySchemaAcceptsAnyData(string? data) => Assert.Equal(0, ErrorCount("[]", data));

    // ---- required enforcement ----

    [Theory]
    [InlineData("{}")]                    // absent
    [InlineData(null)]                    // no payload at all
    [InlineData("""{"name":""}""")]       // empty string counts as missing
    [InlineData("""{"name":"   "}""")]    // whitespace counts as missing
    [InlineData("""{"name":null}""")]     // explicit null counts as missing
    public void RequiredFieldMissingIsAnError(string? data) => Assert.Equal(1, ErrorCount(RequiredText, data));

    [Fact]
    public void RequiredFieldPresentPasses() => Assert.Equal(0, ErrorCount(RequiredText, """{"name":"Budi"}"""));

    [Fact]
    public void EachMissingRequiredFieldReportsSeparately()
    {
        const string schema = """[{"key":"name","type":"text","required":true},{"key":"age","type":"number","required":true}]""";
        Assert.Equal(2, ErrorCount(schema, "{}"));
    }

    // ---- type matching ----

    [Theory]
    [InlineData("""[{"key":"age","type":"number","required":true}]""", """{"age":30}""", 0)]
    [InlineData("""[{"key":"age","type":"number","required":true}]""", """{"age":"30"}""", 1)]
    [InlineData("""[{"key":"n","type":"integer","required":true}]""", """{"n":3}""", 0)]
    [InlineData("""[{"key":"n","type":"integer","required":true}]""", """{"n":3.5}""", 1)]
    [InlineData("""[{"key":"flag","type":"boolean","required":true}]""", """{"flag":true}""", 0)]
    [InlineData("""[{"key":"flag","type":"boolean","required":true}]""", """{"flag":"true"}""", 1)]
    [InlineData("""[{"key":"d","type":"date","required":true}]""", """{"d":"2026-07-15"}""", 0)]
    [InlineData("""[{"key":"d","type":"date","required":true}]""", """{"d":"not-a-date"}""", 1)]
    public void TypeMismatchIsAnError(string schema, string data, int expectedErrors) =>
        Assert.Equal(expectedErrors, ErrorCount(schema, data));

    // ---- leniency ----

    [Fact]
    public void UnknownFieldsAreIgnored() =>
        Assert.Equal(0, ErrorCount(RequiredText, """{"name":"a","extra":123}"""));

    [Theory]
    [InlineData("{}")]
    [InlineData("""{"nick":""}""")]
    public void OptionalFieldMayBeAbsentOrEmpty(string data) => Assert.Equal(0, ErrorCount(OptionalText, data));

    [Fact]
    public void MalformedFormDataIsRejected()
    {
        Assert.Equal(1, ErrorCount(RequiredText, "not json"));
        Assert.Equal(1, ErrorCount(RequiredText, "[1,2,3]")); // must be an object
    }
}
