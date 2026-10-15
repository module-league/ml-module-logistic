using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LogisticApi.Migrations
{
    /// <inheritdoc />
    public partial class convert_form_fields_to_objects : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // ["id", ...] -> [{"fieldId": "id"}, ...], same order
            migrationBuilder.Sql("""
                UPDATE [lg_sidebar_form]
                SET [fields] = COALESCE((
                    SELECT [value] AS [fieldId]
                    FROM OPENJSON([fields])
                    ORDER BY CAST([key] AS int)
                    FOR JSON PATH), '[]')
                WHERE [fields] LIKE '["%';
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Placeholders and default values are dropped
            migrationBuilder.Sql("""
                UPDATE [lg_sidebar_form]
                SET [fields] = '[' + COALESCE((
                    SELECT STRING_AGG('"' + JSON_VALUE([value], '$.fieldId') + '"', ',') WITHIN GROUP (ORDER BY CAST([key] AS int))
                    FROM OPENJSON([fields])), '') + ']'
                WHERE [fields] LIKE '[{%';
                """);
        }
    }
}
