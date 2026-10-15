using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LogisticApi.Migrations
{
    /// <inheritdoc />
    public partial class add_sidebar_form_table : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "lg_sidebar_form",
                columns: table => new
                {
                    ds_obj_id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    sidebar_id = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    form_title = table.Column<string>(type: "nvarchar(80)", maxLength: 80, nullable: false),
                    form_description = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    is_hidden = table.Column<bool>(type: "bit", nullable: false),
                    is_default = table.Column<bool>(type: "bit", nullable: false),
                    display_order = table.Column<int>(type: "int", nullable: false),
                    fields = table.Column<string>(type: "nvarchar(max)", nullable: false),
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
                    table.PrimaryKey("pk_lg_sidebar_form", x => x.ds_obj_id);
                    table.CheckConstraint("ck_lg_sidebar_form_ds_metadata_json", "ISJSON([ds_metadata]) = 1");
                    table.CheckConstraint("ck_lg_sidebar_form_ds_raw_metadata_json", "ISJSON([ds_raw_metadata]) = 1");
                    table.CheckConstraint("ck_lg_sidebar_form_fields_json", "ISJSON([fields]) = 1");
                });

            migrationBuilder.CreateIndex(
                name: "ix_lg_sidebar_form_ds_is_deleted",
                table: "lg_sidebar_form",
                column: "ds_is_deleted");

            migrationBuilder.CreateIndex(
                name: "ix_lg_sidebar_form_sidebar_id_display_order",
                table: "lg_sidebar_form",
                columns: new[] { "sidebar_id", "display_order" });

            migrationBuilder.CreateIndex(
                name: "ux_lg_sidebar_form_ds_doc_id",
                table: "lg_sidebar_form",
                column: "ds_doc_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ux_lg_sidebar_form_sidebar_id_default",
                table: "lg_sidebar_form",
                column: "sidebar_id",
                unique: true,
                filter: "[is_default] = 1 AND [ds_is_deleted] = 0");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "lg_sidebar_form");
        }
    }
}
