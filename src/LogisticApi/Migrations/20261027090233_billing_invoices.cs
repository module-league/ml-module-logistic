using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LogisticApi.Migrations
{
    /// <inheritdoc />
    public partial class billing_invoices : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "ck_lg_checkpoint_log_status",
                table: "lg_checkpoint_log");

            migrationBuilder.CreateSequence<int>(
                name: "lg_invoice_no_seq");

            migrationBuilder.CreateTable(
                name: "lg_billing_setting",
                columns: table => new
                {
                    ds_obj_id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    shipment_sidebar_id = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    bill_to_field_id = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    zone_field_id = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    party_name_field_id = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    party_address_field_id = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    party_email_field_id = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    party_tax_id_field_id = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    party_registration_field_id = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    party_credit_terms_field_id = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
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
                    table.PrimaryKey("pk_lg_billing_setting", x => x.ds_obj_id);
                    table.CheckConstraint("ck_lg_billing_setting_ds_metadata_json", "ISJSON([ds_metadata]) = 1");
                    table.CheckConstraint("ck_lg_billing_setting_ds_raw_metadata_json", "ISJSON([ds_raw_metadata]) = 1");
                });

            migrationBuilder.CreateTable(
                name: "lg_invoice",
                columns: table => new
                {
                    ds_obj_id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    sequence_no = table.Column<int>(type: "int", nullable: false, defaultValueSql: "NEXT VALUE FOR [lg_invoice_no_seq]"),
                    shipment_id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    dispatch_id = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    party_id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    party_name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    party_registration_no = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    party_tax_id = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    party_address = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    party_email = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    credit_terms_days = table.Column<int>(type: "int", nullable: false),
                    status = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false, defaultValue: "draft"),
                    issue_date = table.Column<DateOnly>(type: "date", nullable: true),
                    due_date = table.Column<DateOnly>(type: "date", nullable: true),
                    currency = table.Column<string>(type: "nvarchar(3)", maxLength: 3, nullable: false),
                    subtotal = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    tax_amount = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    total = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    sent_at = table.Column<DateTime>(type: "datetime2", nullable: true),
                    paid_at = table.Column<DateTime>(type: "datetime2", nullable: true),
                    e_invoice_ref = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    voided_at = table.Column<DateTime>(type: "datetime2", nullable: true),
                    void_reason = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    pricing = table.Column<string>(type: "nvarchar(max)", nullable: false),
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
                    table.PrimaryKey("pk_lg_invoice", x => x.ds_obj_id);
                    table.CheckConstraint("ck_lg_invoice_ds_metadata_json", "ISJSON([ds_metadata]) = 1");
                    table.CheckConstraint("ck_lg_invoice_ds_raw_metadata_json", "ISJSON([ds_raw_metadata]) = 1");
                    table.CheckConstraint("ck_lg_invoice_paid", "[status] <> 'paid' OR [paid_at] IS NOT NULL");
                    table.CheckConstraint("ck_lg_invoice_pricing_json", "ISJSON([pricing]) = 1");
                    table.CheckConstraint("ck_lg_invoice_sent", "[status] = 'draft' OR [status] = 'void' OR ([sent_at] IS NOT NULL AND [issue_date] IS NOT NULL AND [due_date] IS NOT NULL)");
                    table.CheckConstraint("ck_lg_invoice_status", "[status] IN ('draft', 'sent', 'paid', 'void')");
                    table.CheckConstraint("ck_lg_invoice_total", "[total] = [subtotal] + [tax_amount]");
                    table.CheckConstraint("ck_lg_invoice_void", "[status] <> 'void' OR [void_reason] IS NOT NULL");
                });

            migrationBuilder.CreateTable(
                name: "lg_invoice_line",
                columns: table => new
                {
                    ds_obj_id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    invoice_id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    shipment_id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    charge_key = table.Column<string>(type: "nvarchar(40)", maxLength: 40, nullable: false),
                    description = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    basis = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    qty = table.Column<decimal>(type: "decimal(18,3)", precision: 18, scale: 3, nullable: false),
                    unit_price = table.Column<decimal>(type: "decimal(18,4)", precision: 18, scale: 4, nullable: false),
                    amount = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    tax_rate = table.Column<decimal>(type: "decimal(5,2)", precision: 5, scale: 2, nullable: false),
                    source_exception_id = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    sort_order = table.Column<int>(type: "int", nullable: false),
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
                    table.PrimaryKey("pk_lg_invoice_line", x => x.ds_obj_id);
                    table.CheckConstraint("ck_lg_invoice_line_ds_metadata_json", "ISJSON([ds_metadata]) = 1");
                    table.CheckConstraint("ck_lg_invoice_line_ds_raw_metadata_json", "ISJSON([ds_raw_metadata]) = 1");
                });

            migrationBuilder.CreateTable(
                name: "lg_payment",
                columns: table => new
                {
                    ds_obj_id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    invoice_id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    amount = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    paid_at = table.Column<DateTime>(type: "datetime2", nullable: false),
                    method = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    reference = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
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
                    table.PrimaryKey("pk_lg_payment", x => x.ds_obj_id);
                    table.CheckConstraint("ck_lg_payment_amount", "[amount] > 0");
                    table.CheckConstraint("ck_lg_payment_ds_metadata_json", "ISJSON([ds_metadata]) = 1");
                    table.CheckConstraint("ck_lg_payment_ds_raw_metadata_json", "ISJSON([ds_raw_metadata]) = 1");
                });

            migrationBuilder.AddCheckConstraint(
                name: "ck_lg_checkpoint_log_status",
                table: "lg_checkpoint_log",
                sql: "[status] IS NULL OR [status] IN ('planned', 'picked_up', 'in_transit', 'arrived', 'delivered', 'cancelled', 'billed')");

            migrationBuilder.CreateIndex(
                name: "ix_lg_billing_setting_ds_is_deleted",
                table: "lg_billing_setting",
                column: "ds_is_deleted");

            migrationBuilder.CreateIndex(
                name: "ux_lg_billing_setting_ds_doc_id",
                table: "lg_billing_setting",
                column: "ds_doc_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ux_lg_billing_setting_shipment_sidebar_id",
                table: "lg_billing_setting",
                column: "shipment_sidebar_id",
                unique: true,
                filter: "[ds_is_deleted] = 0");

            migrationBuilder.CreateIndex(
                name: "ix_lg_invoice_ds_is_deleted",
                table: "lg_invoice",
                column: "ds_is_deleted");

            migrationBuilder.CreateIndex(
                name: "ix_lg_invoice_status",
                table: "lg_invoice",
                column: "status");

            migrationBuilder.CreateIndex(
                name: "ux_lg_invoice_ds_doc_id",
                table: "lg_invoice",
                column: "ds_doc_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ux_lg_invoice_sequence_no",
                table: "lg_invoice",
                column: "sequence_no",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ux_lg_invoice_shipment_not_void",
                table: "lg_invoice",
                column: "shipment_id",
                unique: true,
                filter: "[status] <> 'void' AND [ds_is_deleted] = 0");

            migrationBuilder.CreateIndex(
                name: "ix_lg_invoice_line_ds_is_deleted",
                table: "lg_invoice_line",
                column: "ds_is_deleted");

            migrationBuilder.CreateIndex(
                name: "ix_lg_invoice_line_invoice_id",
                table: "lg_invoice_line",
                column: "invoice_id");

            migrationBuilder.CreateIndex(
                name: "ix_lg_invoice_line_shipment_id",
                table: "lg_invoice_line",
                column: "shipment_id");

            migrationBuilder.CreateIndex(
                name: "ux_lg_invoice_line_ds_doc_id",
                table: "lg_invoice_line",
                column: "ds_doc_id",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_lg_payment_ds_is_deleted",
                table: "lg_payment",
                column: "ds_is_deleted");

            migrationBuilder.CreateIndex(
                name: "ix_lg_payment_invoice_id",
                table: "lg_payment",
                column: "invoice_id");

            migrationBuilder.CreateIndex(
                name: "ux_lg_payment_ds_doc_id",
                table: "lg_payment",
                column: "ds_doc_id",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "lg_billing_setting");

            migrationBuilder.DropTable(
                name: "lg_invoice");

            migrationBuilder.DropTable(
                name: "lg_invoice_line");

            migrationBuilder.DropTable(
                name: "lg_payment");

            migrationBuilder.DropCheckConstraint(
                name: "ck_lg_checkpoint_log_status",
                table: "lg_checkpoint_log");

            migrationBuilder.DropSequence(
                name: "lg_invoice_no_seq");

            // The old constraint has no billed status: keep those entries as plain notes
            migrationBuilder.Sql("UPDATE [lg_checkpoint_log] SET [status] = NULL WHERE [status] = 'billed';");

            migrationBuilder.AddCheckConstraint(
                name: "ck_lg_checkpoint_log_status",
                table: "lg_checkpoint_log",
                sql: "[status] IS NULL OR [status] IN ('planned', 'picked_up', 'in_transit', 'arrived', 'delivered', 'cancelled')");
        }
    }
}
