using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LogisticApi.Migrations
{
    /// <inheritdoc />
    public partial class shipment_documents : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "lg_document_activity",
                columns: table => new
                {
                    ds_obj_id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    document_id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    shipment_id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    kind = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    actor_id = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    attachment_id = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    version = table.Column<int>(type: "int", nullable: true),
                    source = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    body = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
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
                    table.PrimaryKey("pk_lg_document_activity", x => x.ds_obj_id);
                    table.CheckConstraint("ck_lg_document_activity_ds_metadata_json", "ISJSON([ds_metadata]) = 1");
                    table.CheckConstraint("ck_lg_document_activity_ds_raw_metadata_json", "ISJSON([ds_raw_metadata]) = 1");
                    table.CheckConstraint("ck_lg_document_activity_kind", "[kind] IN ('uploaded', 'verified', 'rejected')");
                    table.CheckConstraint("ck_lg_document_activity_upload_file", "[kind] <> 'uploaded' OR [attachment_id] IS NOT NULL");
                });

            migrationBuilder.CreateTable(
                name: "lg_document_setting",
                columns: table => new
                {
                    ds_obj_id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    shipment_sidebar_id = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    incoterm_field_id = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    attachment_field_id = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
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
                    table.PrimaryKey("pk_lg_document_setting", x => x.ds_obj_id);
                    table.CheckConstraint("ck_lg_document_setting_ds_metadata_json", "ISJSON([ds_metadata]) = 1");
                    table.CheckConstraint("ck_lg_document_setting_ds_raw_metadata_json", "ISJSON([ds_raw_metadata]) = 1");
                });

            migrationBuilder.CreateTable(
                name: "lg_shipment_document",
                columns: table => new
                {
                    ds_obj_id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    shipment_id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    dispatch_id = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    doc_type = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false, defaultValue: "missing"),
                    current_attachment_id = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    version = table.Column<int>(type: "int", nullable: false, defaultValue: 0),
                    source = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    verified_by = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    verified_at = table.Column<DateTime>(type: "datetime2", nullable: true),
                    reject_reason = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    expires_at = table.Column<DateTime>(type: "datetime2", nullable: true),
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
                    table.PrimaryKey("pk_lg_shipment_document", x => x.ds_obj_id);
                    table.CheckConstraint("ck_lg_shipment_document_ds_metadata_json", "ISJSON([ds_metadata]) = 1");
                    table.CheckConstraint("ck_lg_shipment_document_ds_raw_metadata_json", "ISJSON([ds_raw_metadata]) = 1");
                    table.CheckConstraint("ck_lg_shipment_document_file", "[status] = 'missing' OR [current_attachment_id] IS NOT NULL");
                    table.CheckConstraint("ck_lg_shipment_document_rejected", "[status] <> 'rejected' OR [reject_reason] IS NOT NULL");
                    table.CheckConstraint("ck_lg_shipment_document_source", "[source] IS NULL OR [source] IN ('upload', 'generated', 'driver_app', 'dispatcher')");
                    table.CheckConstraint("ck_lg_shipment_document_status", "[status] IN ('missing', 'uploaded', 'verified', 'rejected')");
                    table.CheckConstraint("ck_lg_shipment_document_verified", "[status] <> 'verified' OR [verified_at] IS NOT NULL");
                });

            migrationBuilder.CreateIndex(
                name: "ix_lg_document_activity_document_id",
                table: "lg_document_activity",
                column: "document_id");

            migrationBuilder.CreateIndex(
                name: "ix_lg_document_activity_ds_is_deleted",
                table: "lg_document_activity",
                column: "ds_is_deleted");

            migrationBuilder.CreateIndex(
                name: "ix_lg_document_activity_shipment_id",
                table: "lg_document_activity",
                column: "shipment_id");

            migrationBuilder.CreateIndex(
                name: "ux_lg_document_activity_ds_doc_id",
                table: "lg_document_activity",
                column: "ds_doc_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_lg_document_setting_ds_is_deleted",
                table: "lg_document_setting",
                column: "ds_is_deleted");

            migrationBuilder.CreateIndex(
                name: "ux_lg_document_setting_ds_doc_id",
                table: "lg_document_setting",
                column: "ds_doc_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ux_lg_document_setting_shipment_sidebar_id",
                table: "lg_document_setting",
                column: "shipment_sidebar_id",
                unique: true,
                filter: "[ds_is_deleted] = 0");

            migrationBuilder.CreateIndex(
                name: "ix_lg_shipment_document_ds_is_deleted",
                table: "lg_shipment_document",
                column: "ds_is_deleted");

            migrationBuilder.CreateIndex(
                name: "ix_lg_shipment_document_status",
                table: "lg_shipment_document",
                column: "status");

            migrationBuilder.CreateIndex(
                name: "ux_lg_shipment_document_ds_doc_id",
                table: "lg_shipment_document",
                column: "ds_doc_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ux_lg_shipment_document_shipment_doc_type",
                table: "lg_shipment_document",
                columns: new[] { "shipment_id", "doc_type" },
                unique: true,
                filter: "[doc_type] <> 'other' AND [ds_is_deleted] = 0");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "lg_document_activity");

            migrationBuilder.DropTable(
                name: "lg_document_setting");

            migrationBuilder.DropTable(
                name: "lg_shipment_document");
        }
    }
}
