using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LogisticApi.Migrations
{
    /// <inheritdoc />
    public partial class dispatch_status_moves : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "ck_lg_dispatch_status",
                table: "lg_dispatch");

            migrationBuilder.Sql("UPDATE [lg_dispatch] SET [status] = 'picked_up' WHERE [status] = 'dispatched'");

            migrationBuilder.AddColumn<string>(
                name: "status",
                table: "lg_checkpoint_log",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.AddCheckConstraint(
                name: "ck_lg_dispatch_status",
                table: "lg_dispatch",
                sql: "[status] IN ('planned', 'picked_up', 'in_transit', 'arrived', 'delivered', 'cancelled')");

            migrationBuilder.AddCheckConstraint(
                name: "ck_lg_checkpoint_log_status",
                table: "lg_checkpoint_log",
                sql: "[status] IS NULL OR [status] IN ('planned', 'picked_up', 'in_transit', 'arrived', 'delivered', 'cancelled')");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "ck_lg_dispatch_status",
                table: "lg_dispatch");

            migrationBuilder.DropCheckConstraint(
                name: "ck_lg_checkpoint_log_status",
                table: "lg_checkpoint_log");

            migrationBuilder.DropColumn(
                name: "status",
                table: "lg_checkpoint_log");

            migrationBuilder.Sql("UPDATE [lg_dispatch] SET [status] = CASE [status] WHEN 'picked_up' THEN 'dispatched' ELSE 'in_transit' END WHERE [status] IN ('picked_up', 'arrived')");

            migrationBuilder.AddCheckConstraint(
                name: "ck_lg_dispatch_status",
                table: "lg_dispatch",
                sql: "[status] IN ('planned', 'dispatched', 'in_transit', 'delivered', 'cancelled')");
        }
    }
}
