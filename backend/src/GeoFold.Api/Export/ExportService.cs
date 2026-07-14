using ClosedXML.Excel;
using CsvHelper;
using System.Globalization;

namespace GeoFold.Api.Export;

public enum ExportFormat { Csv, Xlsx }

public class ExportService
{
    public byte[] Generate(IReadOnlyList<SurveyExportRow> rows, ExportFormat format)
    {
        return format switch
        {
            ExportFormat.Csv => GenerateCsv(rows),
            ExportFormat.Xlsx => GenerateXlsx(rows),
            _ => throw new ArgumentOutOfRangeException(nameof(format))
        };
    }

    private static byte[] GenerateCsv(IReadOnlyList<SurveyExportRow> rows)
    {
        using var stream = new MemoryStream();
        using (var writer = new StreamWriter(stream, leaveOpen: true))
        using (var csv = new CsvWriter(writer, CultureInfo.InvariantCulture))
        {
            csv.WriteRecords(rows);
        }
        return stream.ToArray();
    }

    private static byte[] GenerateXlsx(IReadOnlyList<SurveyExportRow> rows)
    {
        using var workbook = new XLWorkbook();
        var ws = workbook.Worksheets.Add("Survey Data");

        string[] headers =
        [
            "Survey ID", "Project", "Surveyor", "Latitude", "Longitude",
            "Accuracy (m)", "Captured At (UTC)", "Status", "Details", "Photo Count"
        ];
        for (var i = 0; i < headers.Length; i++)
            ws.Cell(1, i + 1).Value = headers[i];
        ws.Row(1).Style.Font.Bold = true;

        var row = 2;
        foreach (var r in rows)
        {
            ws.Cell(row, 1).Value = r.SurveyId.ToString();
            ws.Cell(row, 2).Value = r.ProjectName;
            ws.Cell(row, 3).Value = r.SurveyorName;
            ws.Cell(row, 4).Value = r.Latitude;
            ws.Cell(row, 5).Value = r.Longitude;
            ws.Cell(row, 6).Value = r.AccuracyMeters;
            ws.Cell(row, 7).Value = r.CapturedAtUtc;
            ws.Cell(row, 8).Value = r.Status;
            ws.Cell(row, 9).Value = r.DetailsJson;
            ws.Cell(row, 10).Value = r.PhotoCount;
            row++;
        }

        ws.Columns().AdjustToContents();

        using var stream = new MemoryStream();
        workbook.SaveAs(stream);
        return stream.ToArray();
    }

    public static string ContentType(ExportFormat format) => format switch
    {
        ExportFormat.Csv => "text/csv",
        ExportFormat.Xlsx => "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        _ => "application/octet-stream"
    };

    public static string FileExtension(ExportFormat format) => format switch
    {
        ExportFormat.Csv => "csv",
        ExportFormat.Xlsx => "xlsx",
        _ => "bin"
    };
}
