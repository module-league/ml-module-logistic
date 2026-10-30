using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LogisticApi.Migrations
{
    /// <inheritdoc />
    public partial class document_rules_in_settings : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "rules",
                table: "lg_document_setting",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "{\"types\":[],\"requirements\":[]}");

            migrationBuilder.AddCheckConstraint(
                name: "ck_lg_document_setting_rules_json",
                table: "lg_document_setting",
                sql: "ISJSON([rules]) = 1");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "ck_lg_document_setting_rules_json",
                table: "lg_document_setting");

            migrationBuilder.DropColumn(
                name: "rules",
                table: "lg_document_setting");
        }
    }
}
