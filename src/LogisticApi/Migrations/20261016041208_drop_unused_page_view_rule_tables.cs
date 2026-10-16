using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace LogisticApi.Migrations
{
    /// <summary>
    /// Drops the tables of the discarded page views and rules feature, whose migration (20261015110337_add_page_views_rules)
    /// was removed from the code after some databases had applied it; its history row goes too. Databases that never had them are untouched.
    /// </summary>
    public partial class drop_unused_page_view_rule_tables : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("DROP TABLE IF EXISTS [lg_sidebar_rule_activity];");
            migrationBuilder.Sql("DROP TABLE IF EXISTS [lg_sidebar_rule];");
            migrationBuilder.Sql("DROP TABLE IF EXISTS [lg_sidebar_view];");
            migrationBuilder.Sql("DROP TABLE IF EXISTS [lg_sidebar_page];");
            migrationBuilder.Sql("DELETE FROM [__ef_migrations_lg] WHERE [MigrationId] = N'20261015110337_add_page_views_rules';");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // The feature and its schema no longer exist in the code, so there is nothing to restore
        }
    }
}
