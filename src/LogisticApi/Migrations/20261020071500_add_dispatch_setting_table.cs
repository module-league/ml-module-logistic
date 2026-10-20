using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LogisticApi.Migrations
{
    /// <inheritdoc />
    public partial class add_dispatch_setting_table : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "lg_dispatch_setting",
                columns: table => new
                {
                    ds_obj_id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    shipment_sidebar_id = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    title_field_id = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    origin_field_id = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    destination_field_id = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    badge_field_id = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    weight_field_id = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    detail_field_ids = table.Column<string>(type: "nvarchar(max)", nullable: false),
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
                    table.PrimaryKey("pk_lg_dispatch_setting", x => x.ds_obj_id);
                    table.CheckConstraint("ck_lg_dispatch_setting_detail_field_ids_json", "ISJSON([detail_field_ids]) = 1");
                    table.CheckConstraint("ck_lg_dispatch_setting_ds_metadata_json", "ISJSON([ds_metadata]) = 1");
                    table.CheckConstraint("ck_lg_dispatch_setting_ds_raw_metadata_json", "ISJSON([ds_raw_metadata]) = 1");
                });

            migrationBuilder.CreateIndex(
                name: "ix_lg_dispatch_setting_ds_is_deleted",
                table: "lg_dispatch_setting",
                column: "ds_is_deleted");

            migrationBuilder.CreateIndex(
                name: "ux_lg_dispatch_setting_ds_doc_id",
                table: "lg_dispatch_setting",
                column: "ds_doc_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ux_lg_dispatch_setting_shipment_sidebar_id",
                table: "lg_dispatch_setting",
                column: "shipment_sidebar_id",
                unique: true,
                filter: "[ds_is_deleted] = 0");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "lg_dispatch_setting");
        }
    }
}
