using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LogisticApi.Migrations
{
    /// <inheritdoc />
    public partial class shipment_exception_rules : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropPrimaryKey(
                name: "pk_lg_exception",
                table: "lg_exception");

            migrationBuilder.DropIndex(
                name: "ix_lg_exception_shipment_id",
                table: "lg_exception");

            migrationBuilder.DropCheckConstraint(
                name: "ck_lg_exception_ds_metadata_json",
                table: "lg_exception");

            migrationBuilder.DropCheckConstraint(
                name: "ck_lg_exception_ds_raw_metadata_json",
                table: "lg_exception");

            migrationBuilder.DropCheckConstraint(
                name: "ck_lg_exception_resolution",
                table: "lg_exception");

            migrationBuilder.DropCheckConstraint(
                name: "ck_lg_exception_severity",
                table: "lg_exception");

            migrationBuilder.DropCheckConstraint(
                name: "ck_lg_exception_status",
                table: "lg_exception");

            migrationBuilder.DropCheckConstraint(
                name: "ck_lg_exception_type",
                table: "lg_exception");

            migrationBuilder.RenameTable(
                name: "lg_exception",
                newName: "lg_shipment_exception");

            migrationBuilder.RenameIndex(
                name: "ux_lg_exception_ds_doc_id",
                table: "lg_shipment_exception",
                newName: "ux_lg_shipment_exception_ds_doc_id");

            migrationBuilder.RenameIndex(
                name: "ix_lg_exception_status",
                table: "lg_shipment_exception",
                newName: "ix_lg_shipment_exception_status");

            migrationBuilder.RenameIndex(
                name: "ix_lg_exception_ds_is_deleted",
                table: "lg_shipment_exception",
                newName: "ix_lg_shipment_exception_ds_is_deleted");

            migrationBuilder.RenameIndex(
                name: "ix_lg_exception_dispatch_id",
                table: "lg_shipment_exception",
                newName: "ix_lg_shipment_exception_dispatch_id");

            migrationBuilder.AddColumn<DateTime>(
                name: "actual_arrival_at",
                table: "lg_dispatch",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "pickup_weight",
                table: "lg_dispatch",
                type: "decimal(18,3)",
                precision: 18,
                scale: 3,
                nullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "type",
                table: "lg_shipment_exception",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(20)",
                oldMaxLength: 20);

            migrationBuilder.AlterColumn<string>(
                name: "severity",
                table: "lg_shipment_exception",
                type: "nvarchar(10)",
                maxLength: 10,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(10)",
                oldMaxLength: 10,
                oldDefaultValue: "medium");

            migrationBuilder.AlterColumn<Guid>(
                name: "dispatch_id",
                table: "lg_shipment_exception",
                type: "uniqueidentifier",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier");

            migrationBuilder.AddColumn<string>(
                name: "facts",
                table: "lg_shipment_exception",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "facts_key",
                table: "lg_shipment_exception",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "resolution_reason",
                table: "lg_shipment_exception",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "resolved_by",
                table: "lg_shipment_exception",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "respond_by",
                table: "lg_shipment_exception",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<string>(
                name: "rule_key",
                table: "lg_shipment_exception",
                type: "nvarchar(40)",
                maxLength: 40,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<DateTime>(
                name: "snoozed_until",
                table: "lg_shipment_exception",
                type: "datetime2",
                nullable: true);

            migrationBuilder.AddPrimaryKey(
                name: "pk_lg_shipment_exception",
                table: "lg_shipment_exception",
                column: "ds_obj_id");

            migrationBuilder.CreateTable(
                name: "lg_exception_activity",
                columns: table => new
                {
                    ds_obj_id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    exception_id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    kind = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    actor_id = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    body = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
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
                    table.PrimaryKey("pk_lg_exception_activity", x => x.ds_obj_id);
                    table.CheckConstraint("ck_lg_exception_activity_ds_metadata_json", "ISJSON([ds_metadata]) = 1");
                    table.CheckConstraint("ck_lg_exception_activity_ds_raw_metadata_json", "ISJSON([ds_raw_metadata]) = 1");
                    table.CheckConstraint("ck_lg_exception_activity_kind", "[kind] IN ('opened', 'assigned', 'note', 'action', 'resolved', 'auto_closed')");
                });

            migrationBuilder.CreateTable(
                name: "lg_exception_setting",
                columns: table => new
                {
                    ds_obj_id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    shipment_sidebar_id = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    eta_field_id = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    chargeable_weight_field_id = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    mode_field_id = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    opening_hour_field_id = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    location_phone_field_id = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    driver_phone_field_id = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
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
                    table.PrimaryKey("pk_lg_exception_setting", x => x.ds_obj_id);
                    table.CheckConstraint("ck_lg_exception_setting_ds_metadata_json", "ISJSON([ds_metadata]) = 1");
                    table.CheckConstraint("ck_lg_exception_setting_ds_raw_metadata_json", "ISJSON([ds_raw_metadata]) = 1");
                });

            // Exceptions raised by hand before the rules: map them onto the manual rules, keep their details and resolutions
            // as timeline entries, and resolve all but the newest unresolved one per shipment and rule
            migrationBuilder.Sql(@"
UPDATE [lg_shipment_exception] SET
    [rule_key] = CASE [type] WHEN 'failed_delivery' THEN 'delivery_attempt_failed' ELSE 'manual' END,
    [status] = CASE [status] WHEN 'investigating' THEN 'open' ELSE [status] END,
    [respond_by] = DATEADD(hour, 4, [ds_create_time]),
    [facts] = '{}',
    [facts_key] = '{}',
    [resolution_reason] = CASE WHEN [status] = 'resolved' THEN 'Fixed' END,
    [resolved_by] = CASE WHEN [status] = 'resolved' THEN [ds_updated_by] END;

INSERT INTO [lg_exception_activity] ([ds_obj_id], [exception_id], [kind], [actor_id], [body], [ds_create_time], [ds_created_by], [ds_version_no])
SELECT NEWID(), [ds_obj_id], 'opened', [ds_created_by], COALESCE([description], [title]), [ds_create_time], [ds_created_by], 1
FROM [lg_shipment_exception];

INSERT INTO [lg_exception_activity] ([ds_obj_id], [exception_id], [kind], [actor_id], [body], [ds_create_time], [ds_created_by], [ds_version_no])
SELECT NEWID(), [ds_obj_id], 'resolved', [resolved_by], [resolution], COALESCE([resolved_at], SYSUTCDATETIME()), COALESCE([resolved_by], [ds_created_by]), 1
FROM [lg_shipment_exception] WHERE [status] = 'resolved';

WITH [extra] AS (
    SELECT [ds_obj_id], ROW_NUMBER() OVER (PARTITION BY [shipment_id], [rule_key] ORDER BY [ds_doc_id] DESC) AS [n]
    FROM [lg_shipment_exception] WHERE [status] <> 'resolved' AND [ds_is_deleted] = 0)
UPDATE [e] SET [status] = 'resolved', [resolution_reason] = 'Fixed', [resolved_at] = SYSUTCDATETIME()
FROM [lg_shipment_exception] AS [e] JOIN [extra] ON [extra].[ds_obj_id] = [e].[ds_obj_id] WHERE [extra].[n] > 1;");

            migrationBuilder.DropColumn(
                name: "description",
                table: "lg_shipment_exception");

            migrationBuilder.DropColumn(
                name: "resolution",
                table: "lg_shipment_exception");

            migrationBuilder.CreateIndex(
                name: "ix_lg_shipment_exception_rule_key",
                table: "lg_shipment_exception",
                column: "rule_key");

            migrationBuilder.CreateIndex(
                name: "ux_lg_shipment_exception_shipment_rule_unresolved",
                table: "lg_shipment_exception",
                columns: new[] { "shipment_id", "rule_key" },
                unique: true,
                filter: "[status] <> 'resolved' AND [ds_is_deleted] = 0");

            migrationBuilder.AddCheckConstraint(
                name: "ck_lg_shipment_exception_ds_metadata_json",
                table: "lg_shipment_exception",
                sql: "ISJSON([ds_metadata]) = 1");

            migrationBuilder.AddCheckConstraint(
                name: "ck_lg_shipment_exception_ds_raw_metadata_json",
                table: "lg_shipment_exception",
                sql: "ISJSON([ds_raw_metadata]) = 1");

            migrationBuilder.AddCheckConstraint(
                name: "ck_lg_shipment_exception_facts_json",
                table: "lg_shipment_exception",
                sql: "ISJSON([facts]) = 1");

            migrationBuilder.AddCheckConstraint(
                name: "ck_lg_shipment_exception_resolved_reason",
                table: "lg_shipment_exception",
                sql: "[status] <> 'resolved' OR [resolution_reason] IS NOT NULL");

            migrationBuilder.AddCheckConstraint(
                name: "ck_lg_shipment_exception_severity",
                table: "lg_shipment_exception",
                sql: "[severity] IN ('low', 'medium', 'high')");

            migrationBuilder.AddCheckConstraint(
                name: "ck_lg_shipment_exception_snoozed_until",
                table: "lg_shipment_exception",
                sql: "[status] <> 'snoozed' OR [snoozed_until] IS NOT NULL");

            migrationBuilder.AddCheckConstraint(
                name: "ck_lg_shipment_exception_status",
                table: "lg_shipment_exception",
                sql: "[status] IN ('open', 'snoozed', 'resolved')");

            migrationBuilder.CreateIndex(
                name: "ix_lg_exception_activity_ds_is_deleted",
                table: "lg_exception_activity",
                column: "ds_is_deleted");

            migrationBuilder.CreateIndex(
                name: "ix_lg_exception_activity_exception_id",
                table: "lg_exception_activity",
                column: "exception_id");

            migrationBuilder.CreateIndex(
                name: "ux_lg_exception_activity_ds_doc_id",
                table: "lg_exception_activity",
                column: "ds_doc_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_lg_exception_setting_ds_is_deleted",
                table: "lg_exception_setting",
                column: "ds_is_deleted");

            migrationBuilder.CreateIndex(
                name: "ux_lg_exception_setting_ds_doc_id",
                table: "lg_exception_setting",
                column: "ds_doc_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ux_lg_exception_setting_shipment_sidebar_id",
                table: "lg_exception_setting",
                column: "shipment_sidebar_id",
                unique: true,
                filter: "[ds_is_deleted] = 0");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // The old table needs a dispatch and knows no snoozed status or rule-only types
            migrationBuilder.Sql(@"
DELETE FROM [lg_shipment_exception] WHERE [dispatch_id] IS NULL;
UPDATE [lg_shipment_exception] SET
    [status] = CASE [status] WHEN 'snoozed' THEN 'open' ELSE [status] END,
    [type] = CASE WHEN [type] IN ('delay', 'damage', 'failed_delivery', 'wrong_address', 'missing_item') THEN [type] ELSE 'other' END;");

            migrationBuilder.DropTable(
                name: "lg_exception_activity");

            migrationBuilder.DropTable(
                name: "lg_exception_setting");

            migrationBuilder.DropPrimaryKey(
                name: "pk_lg_shipment_exception",
                table: "lg_shipment_exception");

            migrationBuilder.DropIndex(
                name: "ix_lg_shipment_exception_rule_key",
                table: "lg_shipment_exception");

            migrationBuilder.DropIndex(
                name: "ux_lg_shipment_exception_shipment_rule_unresolved",
                table: "lg_shipment_exception");

            migrationBuilder.DropCheckConstraint(
                name: "ck_lg_shipment_exception_ds_metadata_json",
                table: "lg_shipment_exception");

            migrationBuilder.DropCheckConstraint(
                name: "ck_lg_shipment_exception_ds_raw_metadata_json",
                table: "lg_shipment_exception");

            migrationBuilder.DropCheckConstraint(
                name: "ck_lg_shipment_exception_facts_json",
                table: "lg_shipment_exception");

            migrationBuilder.DropCheckConstraint(
                name: "ck_lg_shipment_exception_resolved_reason",
                table: "lg_shipment_exception");

            migrationBuilder.DropCheckConstraint(
                name: "ck_lg_shipment_exception_severity",
                table: "lg_shipment_exception");

            migrationBuilder.DropCheckConstraint(
                name: "ck_lg_shipment_exception_snoozed_until",
                table: "lg_shipment_exception");

            migrationBuilder.DropCheckConstraint(
                name: "ck_lg_shipment_exception_status",
                table: "lg_shipment_exception");

            migrationBuilder.DropColumn(
                name: "actual_arrival_at",
                table: "lg_dispatch");

            migrationBuilder.DropColumn(
                name: "pickup_weight",
                table: "lg_dispatch");

            migrationBuilder.DropColumn(
                name: "facts",
                table: "lg_shipment_exception");

            migrationBuilder.DropColumn(
                name: "facts_key",
                table: "lg_shipment_exception");

            migrationBuilder.DropColumn(
                name: "resolution_reason",
                table: "lg_shipment_exception");

            migrationBuilder.DropColumn(
                name: "resolved_by",
                table: "lg_shipment_exception");

            migrationBuilder.DropColumn(
                name: "respond_by",
                table: "lg_shipment_exception");

            migrationBuilder.DropColumn(
                name: "rule_key",
                table: "lg_shipment_exception");

            migrationBuilder.DropColumn(
                name: "snoozed_until",
                table: "lg_shipment_exception");

            migrationBuilder.RenameTable(
                name: "lg_shipment_exception",
                newName: "lg_exception");

            migrationBuilder.RenameIndex(
                name: "ux_lg_shipment_exception_ds_doc_id",
                table: "lg_exception",
                newName: "ux_lg_exception_ds_doc_id");

            migrationBuilder.RenameIndex(
                name: "ix_lg_shipment_exception_status",
                table: "lg_exception",
                newName: "ix_lg_exception_status");

            migrationBuilder.RenameIndex(
                name: "ix_lg_shipment_exception_ds_is_deleted",
                table: "lg_exception",
                newName: "ix_lg_exception_ds_is_deleted");

            migrationBuilder.RenameIndex(
                name: "ix_lg_shipment_exception_dispatch_id",
                table: "lg_exception",
                newName: "ix_lg_exception_dispatch_id");

            migrationBuilder.AlterColumn<string>(
                name: "type",
                table: "lg_exception",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                oldClrType: typeof(string),
                oldType: "nvarchar(30)",
                oldMaxLength: 30);

            migrationBuilder.AlterColumn<string>(
                name: "severity",
                table: "lg_exception",
                type: "nvarchar(10)",
                maxLength: 10,
                nullable: false,
                defaultValue: "medium",
                oldClrType: typeof(string),
                oldType: "nvarchar(10)",
                oldMaxLength: 10);

            migrationBuilder.AlterColumn<Guid>(
                name: "dispatch_id",
                table: "lg_exception",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"),
                oldClrType: typeof(Guid),
                oldType: "uniqueidentifier",
                oldNullable: true);

            migrationBuilder.AddColumn<string>(
                name: "description",
                table: "lg_exception",
                type: "nvarchar(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "resolution",
                table: "lg_exception",
                type: "nvarchar(2000)",
                maxLength: 2000,
                nullable: true);

            migrationBuilder.Sql("UPDATE [lg_exception] SET [resolution] = 'Resolved' WHERE [status] = 'resolved'");

            migrationBuilder.AddPrimaryKey(
                name: "pk_lg_exception",
                table: "lg_exception",
                column: "ds_obj_id");

            migrationBuilder.CreateIndex(
                name: "ix_lg_exception_shipment_id",
                table: "lg_exception",
                column: "shipment_id");

            migrationBuilder.AddCheckConstraint(
                name: "ck_lg_exception_ds_metadata_json",
                table: "lg_exception",
                sql: "ISJSON([ds_metadata]) = 1");

            migrationBuilder.AddCheckConstraint(
                name: "ck_lg_exception_ds_raw_metadata_json",
                table: "lg_exception",
                sql: "ISJSON([ds_raw_metadata]) = 1");

            migrationBuilder.AddCheckConstraint(
                name: "ck_lg_exception_resolution",
                table: "lg_exception",
                sql: "[status] <> 'resolved' OR [resolution] IS NOT NULL");

            migrationBuilder.AddCheckConstraint(
                name: "ck_lg_exception_severity",
                table: "lg_exception",
                sql: "[severity] IN ('low', 'medium', 'high')");

            migrationBuilder.AddCheckConstraint(
                name: "ck_lg_exception_status",
                table: "lg_exception",
                sql: "[status] IN ('open', 'investigating', 'resolved')");

            migrationBuilder.AddCheckConstraint(
                name: "ck_lg_exception_type",
                table: "lg_exception",
                sql: "[type] IN ('delay', 'damage', 'failed_delivery', 'wrong_address', 'missing_item', 'other')");
        }
    }
}
