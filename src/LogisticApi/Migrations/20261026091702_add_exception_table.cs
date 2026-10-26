using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LogisticApi.Migrations
{
    /// <inheritdoc />
    public partial class add_exception_table : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "lg_exception",
                columns: table => new
                {
                    ds_obj_id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    dispatch_id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    shipment_id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    type = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    severity = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false, defaultValue: "medium"),
                    status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false, defaultValue: "open"),
                    title = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    description = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    owner_id = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    resolution = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    resolved_at = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ds_doc_id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ds_create_time = table.Column<DateTime>(type: "datetime2", nullable: false, defaultValueSql: "SYSUTCDATETIME()"),
                    ds_created_by = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ds_update_time = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ds_updated_by = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ds_is_deleted = table.Column<bool>(type: "bit", nullable: false, defaultValue: false),
                    ds_deleted_at = table.Column<DateTime>(type: "datetime2", nullable: true),
                    ds_deleted_by = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ds_version_no = table.Column<int>(type: "int", nullable: false),
                    ds_extra_col1 = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ds_extra_col2 = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ds_extra_col3 = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ds_extra_col4 = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ds_raw_metadata = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ds_metadata = table.Column<string>(type: "nvarchar(max)", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_lg_exception", x => x.ds_obj_id);
                    table.CheckConstraint("ck_lg_exception_ds_metadata_json", "ISJSON([ds_metadata]) = 1");
                    table.CheckConstraint("ck_lg_exception_ds_raw_metadata_json", "ISJSON([ds_raw_metadata]) = 1");
                    table.CheckConstraint("ck_lg_exception_resolution", "[status] <> 'resolved' OR [resolution] IS NOT NULL");
                    table.CheckConstraint("ck_lg_exception_severity", "[severity] IN ('low', 'medium', 'high')");
                    table.CheckConstraint("ck_lg_exception_status", "[status] IN ('open', 'investigating', 'resolved')");
                    table.CheckConstraint("ck_lg_exception_type", "[type] IN ('delay', 'damage', 'failed_delivery', 'wrong_address', 'missing_item', 'other')");
                });

            migrationBuilder.CreateIndex(
                name: "ix_lg_exception_dispatch_id",
                table: "lg_exception",
                column: "dispatch_id");

            migrationBuilder.CreateIndex(
                name: "ix_lg_exception_ds_is_deleted",
                table: "lg_exception",
                column: "ds_is_deleted");

            migrationBuilder.CreateIndex(
                name: "ix_lg_exception_shipment_id",
                table: "lg_exception",
                column: "shipment_id");

            migrationBuilder.CreateIndex(
                name: "ix_lg_exception_status",
                table: "lg_exception",
                column: "status");

            migrationBuilder.CreateIndex(
                name: "ux_lg_exception_ds_doc_id",
                table: "lg_exception",
                column: "ds_doc_id",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "lg_exception");
        }
    }
}
