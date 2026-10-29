using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LogisticApi.Migrations
{
    /// <inheritdoc />
    public partial class document_activity_removed : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "ck_lg_document_activity_kind",
                table: "lg_document_activity");

            migrationBuilder.AddCheckConstraint(
                name: "ck_lg_document_activity_kind",
                table: "lg_document_activity",
                sql: "[kind] IN ('uploaded', 'verified', 'rejected', 'removed')");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "ck_lg_document_activity_kind",
                table: "lg_document_activity");

            migrationBuilder.AddCheckConstraint(
                name: "ck_lg_document_activity_kind",
                table: "lg_document_activity",
                sql: "[kind] IN ('uploaded', 'verified', 'rejected')");
        }
    }
}
