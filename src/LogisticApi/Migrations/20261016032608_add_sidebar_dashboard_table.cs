using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LogisticApi.Migrations
{
    /// <inheritdoc />
    public partial class add_sidebar_dashboard_table : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "lg_sidebar_dashboard",
                columns: table => new
                {
                    ds_obj_id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    sidebar_id = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    title = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: true),
                    description = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    date_range = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    range_sidebar_id = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    range_field_id = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    new_record_sidebar_id = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    new_record_label = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: true),
                    widgets = table.Column<string>(type: "nvarchar(max)", nullable: false),
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
                    table.PrimaryKey("pk_lg_sidebar_dashboard", x => x.ds_obj_id);
                    table.CheckConstraint("ck_lg_sidebar_dashboard_ds_metadata_json", "ISJSON([ds_metadata]) = 1");
                    table.CheckConstraint("ck_lg_sidebar_dashboard_ds_raw_metadata_json", "ISJSON([ds_raw_metadata]) = 1");
                    table.CheckConstraint("ck_lg_sidebar_dashboard_widgets_json", "ISJSON([widgets]) = 1");
                });

            migrationBuilder.CreateIndex(
                name: "ix_lg_sidebar_dashboard_ds_is_deleted",
                table: "lg_sidebar_dashboard",
                column: "ds_is_deleted");

            migrationBuilder.CreateIndex(
                name: "ux_lg_sidebar_dashboard_ds_doc_id",
                table: "lg_sidebar_dashboard",
                column: "ds_doc_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ux_lg_sidebar_dashboard_sidebar_id",
                table: "lg_sidebar_dashboard",
                column: "sidebar_id",
                unique: true,
                filter: "[ds_is_deleted] = 0");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "lg_sidebar_dashboard");
        }
    }
}
