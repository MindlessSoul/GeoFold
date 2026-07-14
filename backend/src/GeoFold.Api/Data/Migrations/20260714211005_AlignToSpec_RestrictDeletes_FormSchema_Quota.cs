using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace GeoFold.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AlignToSpec_RestrictDeletes_FormSchema_Quota : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_projects_profiles_UserId",
                table: "projects");

            migrationBuilder.DropForeignKey(
                name: "FK_subscriptions_profiles_UserId",
                table: "subscriptions");

            migrationBuilder.DropForeignKey(
                name: "FK_survey_photos_surveys_SurveyId",
                table: "survey_photos");

            migrationBuilder.DropForeignKey(
                name: "FK_surveys_profiles_UserId",
                table: "surveys");

            migrationBuilder.DropForeignKey(
                name: "FK_surveys_projects_ProjectId",
                table: "surveys");

            migrationBuilder.AddColumn<int>(
                name: "MaxProjects",
                table: "subscriptions",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "MaxSurveysPerMonth",
                table: "subscriptions",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "StorageQuotaMb",
                table: "subscriptions",
                type: "integer",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FormSchema",
                table: "projects",
                type: "jsonb",
                nullable: false,
                defaultValueSql: "'[]'::jsonb");

            migrationBuilder.AddForeignKey(
                name: "FK_projects_profiles_UserId",
                table: "projects",
                column: "UserId",
                principalTable: "profiles",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_subscriptions_profiles_UserId",
                table: "subscriptions",
                column: "UserId",
                principalTable: "profiles",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_survey_photos_surveys_SurveyId",
                table: "survey_photos",
                column: "SurveyId",
                principalTable: "surveys",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_surveys_profiles_UserId",
                table: "surveys",
                column: "UserId",
                principalTable: "profiles",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_surveys_projects_ProjectId",
                table: "surveys",
                column: "ProjectId",
                principalTable: "projects",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_projects_profiles_UserId",
                table: "projects");

            migrationBuilder.DropForeignKey(
                name: "FK_subscriptions_profiles_UserId",
                table: "subscriptions");

            migrationBuilder.DropForeignKey(
                name: "FK_survey_photos_surveys_SurveyId",
                table: "survey_photos");

            migrationBuilder.DropForeignKey(
                name: "FK_surveys_profiles_UserId",
                table: "surveys");

            migrationBuilder.DropForeignKey(
                name: "FK_surveys_projects_ProjectId",
                table: "surveys");

            migrationBuilder.DropColumn(
                name: "MaxProjects",
                table: "subscriptions");

            migrationBuilder.DropColumn(
                name: "MaxSurveysPerMonth",
                table: "subscriptions");

            migrationBuilder.DropColumn(
                name: "StorageQuotaMb",
                table: "subscriptions");

            migrationBuilder.DropColumn(
                name: "FormSchema",
                table: "projects");

            migrationBuilder.AddForeignKey(
                name: "FK_projects_profiles_UserId",
                table: "projects",
                column: "UserId",
                principalTable: "profiles",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_subscriptions_profiles_UserId",
                table: "subscriptions",
                column: "UserId",
                principalTable: "profiles",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_survey_photos_surveys_SurveyId",
                table: "survey_photos",
                column: "SurveyId",
                principalTable: "surveys",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_surveys_profiles_UserId",
                table: "surveys",
                column: "UserId",
                principalTable: "profiles",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_surveys_projects_ProjectId",
                table: "surveys",
                column: "ProjectId",
                principalTable: "projects",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
