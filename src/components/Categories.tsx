import { 
  BookOpen, 
  Shirt, 
  Utensils, 
  Package, 
  Laptop, 
  Camera, 
  Scissors, 
  Truck 
} from "lucide-react";

const categories = [
  { icon: BookOpen, name: "Academic Help", count: 156, color: "bg-blue-500/10 text-blue-600" },
  { icon: Shirt, name: "Laundry", count: 89, color: "bg-purple-500/10 text-purple-600" },
  { icon: Utensils, name: "Food & Cooking", count: 124, color: "bg-orange-500/10 text-orange-600" },
  { icon: Package, name: "Errands", count: 203, color: "bg-primary/10 text-primary" },
  { icon: Laptop, name: "Tech & Design", count: 67, color: "bg-cyan-500/10 text-cyan-600" },
  { icon: Camera, name: "Photography", count: 45, color: "bg-pink-500/10 text-pink-600" },
  { icon: Scissors, name: "Beauty & Grooming", count: 78, color: "bg-rose-500/10 text-rose-600" },
  { icon: Truck, name: "Moving & Lifting", count: 34, color: "bg-amber-500/10 text-amber-600" },
];

const Categories = () => {
  return (
    <section id="categories" className="py-20 md:py-28 bg-secondary/50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <span className="inline-block text-sm font-semibold text-primary mb-3 uppercase tracking-wide">
            Gig Categories
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Find Your Hustle
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-lg">
            From assignments to afro styling, we've got every campus need covered.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-5xl mx-auto">
          {categories.map((category, index) => (
            <div
              key={index}
              className="group bg-card rounded-2xl p-6 border border-border shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 cursor-pointer"
            >
              <div className={`h-12 w-12 rounded-xl ${category.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                <category.icon className="h-6 w-6" />
              </div>
              <h3 className="font-semibold text-foreground mb-1">{category.name}</h3>
              <p className="text-sm text-muted-foreground">{category.count} gigs</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Categories;
