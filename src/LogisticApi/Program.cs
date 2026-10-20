using LogisticApi.Services;
using LogisticApi.Context;
using LogisticApi.Models;
using Microsoft.EntityFrameworkCore;
using ModuleLeague.Core.Abstractions;
using ModuleLeague.Core.Interceptors;

var builder = WebApplication.CreateBuilder(args);

// Connection string: same key in every environment, value differs per appsettings file
var connectionString = builder.Configuration.GetConnectionString("DefaultConnection")
    ?? throw new InvalidOperationException("Connection string 'DefaultConnection' is not configured.");

// Current user + audit interceptor (fills ds_ fields on save)
builder.Services.AddHttpContextAccessor();
builder.Services.AddScoped<ICurrentUser, HttpCurrentUser>();
builder.Services.AddScoped<MLAuditFieldsInterceptor>();
builder.Services.AddScoped<SidebarRecordService>();


// Database
builder.Services.AddDbContext<ContextDb>((sp, options) =>
    options.UseSqlServer(connectionString,
                sql => sql.MigrationsHistoryTable("__ef_migrations_lg"))
           .AddInterceptors(sp.GetRequiredService<MLAuditFieldsInterceptor>()));

// Field templates per sidebar
builder.Services.AddScoped<SidebarFieldService>();
builder.Services.AddScoped<SidebarFormService>();
builder.Services.AddScoped<SidebarDashboardService>();

// Files for attachment fields, saved on disk
builder.Services.Configure<AttachmentStorageOptions>(builder.Configuration.GetSection(AttachmentStorageOptions.Section));
builder.Services.AddScoped<AttachmentService>();

// Dispatches, picking records from the sidebars named in appsettings
builder.Services.Configure<DispatchOptions>(builder.Configuration.GetSection(DispatchOptions.Section));
builder.Services.AddScoped<DispatchService>();
builder.Services.AddScoped<CheckpointLogService>();

// Expected failures (400/404/409) thrown as ApiProblemException become ProblemDetails responses
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<ApiProblemHandler>();

// Add services to the container.
builder.Services.AddControllers();
builder.Services.AddOpenApi();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new() { Title = "Module League - Logistic API", Version = "v1" });
});

var app = builder.Build();

app.UseExceptionHandler();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "Logistic API v1");
    });
}

// In development the web app reaches the API through the Vite proxy on plain http://localhost:5000;
// a redirect to https would send the browser cross-origin
if (!app.Environment.IsDevelopment())
{
    app.UseHttpsRedirection();
}
app.UseAuthorization();

app.MapControllers();

app.Run();