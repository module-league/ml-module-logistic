using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LogisticApi.Migrations
{
    /// <inheritdoc />
    public partial class remove_checkpoint_log_about : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "ck_lg_checkpoint_log_about",
                table: "lg_checkpoint_log");

            migrationBuilder.DropColumn(
                name: "about",
                table: "lg_checkpoint_log");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "about",
                table: "lg_checkpoint_log",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "general");

            migrationBuilder.AddCheckConstraint(
                name: "ck_lg_checkpoint_log_about",
                table: "lg_checkpoint_log",
                sql: "[about] IN ('general', 'picked_up', 'arrived', 'delivered')");
        }
    }
}
