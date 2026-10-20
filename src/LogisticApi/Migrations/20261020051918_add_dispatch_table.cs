using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LogisticApi.Migrations
{
    /// <inheritdoc />
    public partial class add_dispatch_table : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "lg_dispatch",
                columns: table => new
                {
                    ds_obj_id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    shipment_id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    driver_id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    vehicle_id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    origin_id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    destination_id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    planned_pickup_at = table.Column<DateTime>(type: "datetime2", nullable: false),
                    planned_delivery_at = table.Column<DateTime>(type: "datetime2", nullable: true),
                    actual_pickup_at = table.Column<DateTime>(type: "datetime2", nullable: true),
                    actual_delivery_at = table.Column<DateTime>(type: "datetime2", nullable: true),
                    status = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false, defaultValue: "planned"),
                    notes = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
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
                    table.PrimaryKey("pk_lg_dispatch", x => x.ds_obj_id);
                    table.CheckConstraint("ck_lg_dispatch_ds_metadata_json", "ISJSON([ds_metadata]) = 1");
                    table.CheckConstraint("ck_lg_dispatch_ds_raw_metadata_json", "ISJSON([ds_raw_metadata]) = 1");
                    table.CheckConstraint("ck_lg_dispatch_origin_destination", "[origin_id] <> [destination_id]");
                    table.CheckConstraint("ck_lg_dispatch_status", "[status] IN ('planned', 'dispatched', 'in_transit', 'delivered', 'cancelled')");
                });

            migrationBuilder.CreateIndex(
                name: "ix_lg_dispatch_driver_id",
                table: "lg_dispatch",
                column: "driver_id");

            migrationBuilder.CreateIndex(
                name: "ix_lg_dispatch_ds_is_deleted",
                table: "lg_dispatch",
                column: "ds_is_deleted");

            migrationBuilder.CreateIndex(
                name: "ix_lg_dispatch_planned_pickup_at",
                table: "lg_dispatch",
                column: "planned_pickup_at");

            migrationBuilder.CreateIndex(
                name: "ix_lg_dispatch_shipment_id",
                table: "lg_dispatch",
                column: "shipment_id");

            migrationBuilder.CreateIndex(
                name: "ix_lg_dispatch_status",
                table: "lg_dispatch",
                column: "status");

            migrationBuilder.CreateIndex(
                name: "ix_lg_dispatch_vehicle_id",
                table: "lg_dispatch",
                column: "vehicle_id");

            migrationBuilder.CreateIndex(
                name: "ux_lg_dispatch_ds_doc_id",
                table: "lg_dispatch",
                column: "ds_doc_id",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "lg_dispatch");
        }
    }
}
