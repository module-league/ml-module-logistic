using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LogisticApi.Migrations
{
    /// <inheritdoc />
    public partial class add_sidebarId_Logistic : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_lg_logistic_status",
                table: "lg_logistic");

            migrationBuilder.DropColumn(
                name: "CreatedAt",
                table: "lg_logistic");

            migrationBuilder.DropColumn(
                name: "Id",
                table: "lg_logistic");

            migrationBuilder.DropColumn(
                name: "destination",
                table: "lg_logistic");

            migrationBuilder.DropColumn(
                name: "origin",
                table: "lg_logistic");

            migrationBuilder.DropColumn(
                name: "status",
                table: "lg_logistic");

            migrationBuilder.DropColumn(
                name: "tracking_no",
                table: "lg_logistic");

            migrationBuilder.AddColumn<string>(
                name: "sidebar_id",
                table: "lg_logistic",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "sidebar_id",
                table: "lg_logistic");

            migrationBuilder.AddColumn<DateTime>(
                name: "CreatedAt",
                table: "lg_logistic",
                type: "datetime2",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<string>(
                name: "Id",
                table: "lg_logistic",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "destination",
                table: "lg_logistic",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "origin",
                table: "lg_logistic",
                type: "nvarchar(200)",
                maxLength: 200,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "status",
                table: "lg_logistic",
                type: "nvarchar(30)",
                maxLength: 30,
                nullable: false,
                defaultValue: "Pending");

            migrationBuilder.AddColumn<string>(
                name: "tracking_no",
                table: "lg_logistic",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "");

            migrationBuilder.CreateIndex(
                name: "ix_lg_logistic_status",
                table: "lg_logistic",
                column: "status");
        }
    }
}
