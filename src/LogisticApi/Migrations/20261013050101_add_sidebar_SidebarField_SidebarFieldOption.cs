using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LogisticApi.Migrations
{
    /// <inheritdoc />
    public partial class add_sidebar_SidebarField_SidebarFieldOption : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "lg_sidebar_field",
                columns: table => new
                {
                    ds_obj_id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    sidebar_id = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    name = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    description = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    type = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    display_order = table.Column<int>(type: "int", nullable: false),
                    is_primary_field = table.Column<bool>(type: "bit", nullable: false),
                    is_editable = table.Column<bool>(type: "bit", nullable: false),
                    is_system_field = table.Column<bool>(type: "bit", nullable: false),
                    settings = table.Column<string>(type: "nvarchar(max)", nullable: true),
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
                    table.PrimaryKey("pk_lg_sidebar_field", x => x.ds_obj_id);
                    table.CheckConstraint("ck_lg_sidebar_field_ds_metadata_json", "ISJSON([ds_metadata]) = 1");
                    table.CheckConstraint("ck_lg_sidebar_field_ds_raw_metadata_json", "ISJSON([ds_raw_metadata]) = 1");
                    table.CheckConstraint("ck_lg_sidebar_field_settings_json", "ISJSON([settings]) = 1");
                    table.CheckConstraint("ck_lg_sidebar_field_type", "[type] IN ('text', 'long_text', 'number', 'single_select', 'multi_select', 'checkbox', 'date', 'member', 'lookup', 'mirror', 'templating', 'associate', 'attachment', 'record_attachment', 'sys_creator_id', 'sys_create_time', 'sys_updater_id', 'sys_update_time', 'sys_running_number')");
                });

            migrationBuilder.CreateTable(
                name: "lg_sidebar_field_option",
                columns: table => new
                {
                    ds_obj_id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    field_obj_id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    value = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    color_code = table.Column<string>(type: "nvarchar(7)", maxLength: 7, nullable: true),
                    display_order = table.Column<int>(type: "int", nullable: false),
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
                    table.PrimaryKey("pk_lg_sidebar_field_option", x => x.ds_obj_id);
                    table.CheckConstraint("ck_lg_sidebar_field_option_color_code_hex", "[color_code] IS NULL OR [color_code] LIKE '#[0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f][0-9A-Fa-f]'");
                    table.CheckConstraint("ck_lg_sidebar_field_option_ds_metadata_json", "ISJSON([ds_metadata]) = 1");
                    table.CheckConstraint("ck_lg_sidebar_field_option_ds_raw_metadata_json", "ISJSON([ds_raw_metadata]) = 1");
                    table.ForeignKey(
                        name: "fk_lg_sidebar_field_option_sidebar_field",
                        column: x => x.field_obj_id,
                        principalTable: "lg_sidebar_field",
                        principalColumn: "ds_obj_id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "ix_lg_logistic_sidebar_id",
                table: "lg_logistic",
                column: "sidebar_id");

            migrationBuilder.CreateIndex(
                name: "ix_lg_sidebar_field_ds_is_deleted",
                table: "lg_sidebar_field",
                column: "ds_is_deleted");

            migrationBuilder.CreateIndex(
                name: "ix_lg_sidebar_field_sidebar_id_display_order",
                table: "lg_sidebar_field",
                columns: new[] { "sidebar_id", "display_order" });

            migrationBuilder.CreateIndex(
                name: "ux_lg_sidebar_field_ds_doc_id",
                table: "lg_sidebar_field",
                column: "ds_doc_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ux_lg_sidebar_field_sidebar_id_name",
                table: "lg_sidebar_field",
                columns: new[] { "sidebar_id", "name" },
                unique: true,
                filter: "[ds_is_deleted] = 0");

            migrationBuilder.CreateIndex(
                name: "ix_lg_sidebar_field_option_ds_is_deleted",
                table: "lg_sidebar_field_option",
                column: "ds_is_deleted");

            migrationBuilder.CreateIndex(
                name: "ix_lg_sidebar_field_option_field_obj_id_display_order",
                table: "lg_sidebar_field_option",
                columns: new[] { "field_obj_id", "display_order" });

            migrationBuilder.CreateIndex(
                name: "ux_lg_sidebar_field_option_ds_doc_id",
                table: "lg_sidebar_field_option",
                column: "ds_doc_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ux_lg_sidebar_field_option_field_obj_id_value",
                table: "lg_sidebar_field_option",
                columns: new[] { "field_obj_id", "value" },
                unique: true,
                filter: "[ds_is_deleted] = 0");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "lg_sidebar_field_option");

            migrationBuilder.DropTable(
                name: "lg_sidebar_field");

            migrationBuilder.DropIndex(
                name: "ix_lg_logistic_sidebar_id",
                table: "lg_logistic");
        }
    }
}
