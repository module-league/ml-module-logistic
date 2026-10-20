using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LogisticApi.Migrations
{
    /// <inheritdoc />
    public partial class add_checkpoint_log_table : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "lg_checkpoint_log",
                columns: table => new
                {
                    ds_obj_id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    dispatch_id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    about = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false, defaultValue: "general"),
                    note = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    internal_only = table.Column<bool>(type: "bit", nullable: false, defaultValue: false),
                    attachments = table.Column<string>(type: "nvarchar(max)", nullable: false),
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
                    table.PrimaryKey("pk_lg_checkpoint_log", x => x.ds_obj_id);
                    table.CheckConstraint("ck_lg_checkpoint_log_about", "[about] IN ('general', 'picked_up', 'arrived', 'delivered')");
                    table.CheckConstraint("ck_lg_checkpoint_log_attachments_json", "ISJSON([attachments]) = 1");
                    table.CheckConstraint("ck_lg_checkpoint_log_ds_metadata_json", "ISJSON([ds_metadata]) = 1");
                    table.CheckConstraint("ck_lg_checkpoint_log_ds_raw_metadata_json", "ISJSON([ds_raw_metadata]) = 1");
                });

            migrationBuilder.CreateIndex(
                name: "ix_lg_checkpoint_log_dispatch_id",
                table: "lg_checkpoint_log",
                column: "dispatch_id");

            migrationBuilder.CreateIndex(
                name: "ix_lg_checkpoint_log_ds_is_deleted",
                table: "lg_checkpoint_log",
                column: "ds_is_deleted");

            migrationBuilder.CreateIndex(
                name: "ux_lg_checkpoint_log_ds_doc_id",
                table: "lg_checkpoint_log",
                column: "ds_doc_id",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "lg_checkpoint_log");
        }
    }
}
