using LogisticApi.Models;
using Microsoft.EntityFrameworkCore;
using ModuleLeague.Core.Context;

namespace LogisticApi.Context
{
    public class ContextDb : MLDbContext
    {
        // The constructor passes configuration options down to the base context
        public ContextDb(DbContextOptions<ContextDb> options) : base(options)
        {
        }

        // Define your database tables here
        public virtual DbSet<Logistic> Logistics { get; set; } = null!;
        //public virtual DbSet<JobOrder> JobOrders { get; set; } = null!;
    }
}