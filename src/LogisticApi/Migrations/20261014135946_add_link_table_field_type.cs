using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LogisticApi.Migrations
{
    /// <inheritdoc />
    public partial class add_link_table_field_type : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "ck_lg_sidebar_field_type",
                table: "lg_sidebar_field");

            migrationBuilder.AddCheckConstraint(
                name: "ck_lg_sidebar_field_type",
                table: "lg_sidebar_field",
                sql: "[type] IN ('text', 'long_text', 'number', 'single_select', 'multi_select', 'checkbox', 'date', 'member', 'link_table', 'lookup', 'mirror', 'templating', 'currency', 'associate', 'attachment', 'record_attachment', 'sys_creator_id', 'sys_create_time', 'sys_updater_id', 'sys_update_time', 'sys_running_number')");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "ck_lg_sidebar_field_type",
                table: "lg_sidebar_field");

            migrationBuilder.AddCheckConstraint(
                name: "ck_lg_sidebar_field_type",
                table: "lg_sidebar_field",
                sql: "[type] IN ('text', 'long_text', 'number', 'single_select', 'multi_select', 'checkbox', 'date', 'member', 'lookup', 'mirror', 'templating', 'currency', 'associate', 'attachment', 'record_attachment', 'sys_creator_id', 'sys_create_time', 'sys_updater_id', 'sys_update_time', 'sys_running_number')");
        }
    }
}
