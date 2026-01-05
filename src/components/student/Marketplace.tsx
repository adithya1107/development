import { useState, useEffect } from "react";
import { Search, Loader2, Package, Mail, Phone, User, ArrowLeft, Plus, X, Trash2, Upload, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const categories = [
  { value: "all", label: "All Items" },
  { value: "books", label: "Books" },
  { value: "electronics", label: "Electronics" },
  { value: "furniture", label: "Furniture" },
  { value: "clothing", label: "Clothing" },
  { value: "sports", label: "Sports" },
  { value: "other", label: "Other" }
];

const categoryStyles = {
  books: "bg-white/5 text-white/90 border-white/20",
  electronics: "bg-white/5 text-white/90 border-white/20",
  furniture: "bg-white/5 text-white/90 border-white/20",
  clothing: "bg-white/5 text-white/90 border-white/20",
  sports: "bg-white/5 text-white/90 border-white/20",
  other: "bg-white/5 text-white/90 border-white/20"
};

const conditions = [
  { value: "new", label: "New" },
  { value: "like_new", label: "Like New" },
  { value: "good", label: "Good" },
  { value: "fair", label: "Fair" }
];

const MarketplaceApp = ({ onNavigateToChat }) => {
  const [view, setView] = useState("marketplace");
  const [selectedProduct, setSelectedProduct] = useState(null);

  return (
    <div className="min-h-screen bg-background">
      {view === "marketplace" && (
        <Marketplace 
          onViewProduct={(p) => { setSelectedProduct(p); setView("detail"); }} 
          onSellClick={() => setView("sell")}
          onMyListingsClick={() => setView("mylistings")}
        />
      )}
      {view === "detail" && (
        <ProductDetail 
          product={selectedProduct} 
          onBack={() => { setView("marketplace"); setSelectedProduct(null); }}
          onNavigateToChat={onNavigateToChat}
        />
      )}
      {view === "sell" && (
        <SellItem onBack={() => setView("marketplace")} />
      )}
      {view === "mylistings" && (
        <MyListings 
          onBack={() => setView("marketplace")}
          onViewProduct={(p) => { setSelectedProduct(p); setView("detail"); }}
        />
      )}
    </div>
  );
};

const Marketplace = ({ onViewProduct, onSellClick, onMyListingsClick }) => {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [products, selectedCategory, searchQuery]);

  const fetchProducts = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("college_id")
        .eq("id", user.id)
        .single();

      if (!profile) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("marketplace_items")
        .select(`
          *,
          seller:user_profiles!seller_id(
            first_name,
            last_name,
            email,
            phone_number
          )
        `)
        .eq("college_id", profile.college_id)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error("Failed to load products:", error);
    } finally {
      setLoading(false);
    }
  };

  const filterProducts = () => {
    let filtered = products;
    if (selectedCategory !== "all") {
      filtered = filtered.filter((p) => p.category === selectedCategory);
    }
    if (searchQuery) {
      filtered = filtered.filter((p) =>
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    setFilteredProducts(filtered);
  };

  return (
    <div className="space-y-3 sm:space-y-6 max-w-6xl">
      {/* Header Card */}
      <div className="card-minimal glass-effect border-primary/20">
        <div>
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Student Marketplace</h2>
              <p className="text-muted-foreground">Buy and sell used items with fellow students in your community</p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search for textbooks, electronics, furniture..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-lg bg-background border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all duration-300"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={onSellClick}
              className="w-full sm:w-auto px-6 py-3 rounded-lg font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300 flex items-center justify-center gap-2"
            >
              <Plus className="h-5 w-5" />
              List an Item
            </button>

            <button
              onClick={onMyListingsClick}
              className="w-full sm:w-auto px-6 py-3 rounded-lg font-semibold bg-card text-foreground hover:bg-accent transition-all duration-300 flex items-center justify-center gap-2 border border-border"
            >
              <Package className="h-5 w-5" />
              My Listings
            </button>
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {categories.map((category) => {
          const isSelected = selectedCategory === category.value;
          return (
            <button
              key={category.value}
              onClick={() => setSelectedCategory(category.value)}
              className={`px-5 py-2.5 rounded-lg font-medium transition-all duration-300 whitespace-nowrap border ${
                isSelected
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-card text-muted-foreground border-border hover:bg-accent hover:text-foreground"
              }`}
            >
              {category.label}
            </button>
          );
        })}
      </div>

      {/* Loading & Products Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="card-minimal text-center py-16">
          <Package className="h-20 w-20 text-muted-foreground mx-auto mb-4" />
          <p className="text-xl font-semibold mb-2 text-foreground">No items found</p>
          <p className="text-muted-foreground">Try adjusting your search or be the first to list something!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
              onClick={() => onViewProduct(product)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const ProductCard = ({ product, onClick }) => {
  const firstImage = product.images && product.images.length > 0 ? product.images[0] : null;
  
  return (
    <div
      onClick={onClick}
      className="card-minimal glass-effect border-primary/20 hover:border-accent/40 transition-all duration-300 cursor-pointer group overflow-hidden"
    >
      <div className="aspect-square bg-muted overflow-hidden relative">
        {firstImage ? (
          <img
            src={firstImage}
            alt={product.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <Package className="h-20 w-20 text-muted-foreground/30" />
          </div>
        )}
      </div>

      <div className="p-5">
        <h3 className="font-bold text-lg line-clamp-2 mb-2 text-foreground group-hover:text-primary transition-colors">
          {product.title}
        </h3>
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2 leading-relaxed">
          {product.description}
        </p>
        <div className="flex items-center justify-between">
          <div className="text-2xl font-bold text-primary">
            ₹{product.price}
          </div>
          <span className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-border bg-card text-muted-foreground">
            {product.category}
          </span>
        </div>
      </div>
    </div>
  );
};

const ProductDetail = ({ product, onBack, onNavigateToChat }) => {
  const categoryStyle = categoryStyles[product.category] || categoryStyles.other;
  const firstImage = product.images && product.images.length > 0 ? product.images[0] : null;
  const sellerName = product.seller ? `${product.seller.first_name} ${product.seller.last_name}` : "Anonymous";
  const sellerEmail = product.seller?.email || "";
  const sellerPhone = product.seller?.phone_number;
  const [contacting, setContacting] = useState(false);

  const handleContactSeller = async () => {
    setContacting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert("Please sign in to contact the seller");
        setContacting(false);
        return;
      }

      const { data: myChannels } = await supabase
        .from('channel_members')
        .select('channel_id')
        .eq('user_id', user.id);

      const myChannelIds = myChannels?.map(c => c.channel_id) || [];

      if (myChannelIds.length > 0) {
        const { data: theirChannels } = await supabase
          .from('channel_members')
          .select('channel_id, communication_channels!inner(channel_type, id)')
          .eq('user_id', product.seller_id)
          .in('channel_id', myChannelIds);

        const existingDirect = theirChannels?.find(
          c => c.communication_channels.channel_type === 'direct_message'
        );

        if (existingDirect) {
          if (onNavigateToChat) {
            onNavigateToChat(existingDirect.communication_channels.id);
          }
          setContacting(false);
          return;
        }
      }

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("college_id")
        .eq("id", user.id)
        .single();

      const { data: newChannel, error: channelError } = await supabase
        .from('communication_channels')
        .insert({
          college_id: profile.college_id,
          channel_name: sellerName,
          channel_type: 'direct_message',
          is_public: false,
          created_by: user.id
        })
        .select()
        .single();

      if (channelError) throw channelError;

      const { error: memberError } = await supabase
        .from('channel_members')
        .insert([
          { channel_id: newChannel.id, user_id: user.id, role: 'member' },
          { channel_id: newChannel.id, user_id: product.seller_id, role: 'member' }
        ]);

      if (memberError) throw memberError;

      await supabase
        .from('messages')
        .insert({
          channel_id: newChannel.id,
          sender_id: user.id,
          message_text: `Hi! I'm interested in your listing: ${product.title} (₹${product.price})`,
          message_type: 'text'
        });

      if (onNavigateToChat) {
        onNavigateToChat(newChannel.id);
      }
    } catch (error) {
      console.error('Error contacting seller:', error);
      alert('Failed to contact seller: ' + error.message);
    } finally {
      setContacting(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6 max-w-7xl mx-auto">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground font-medium transition-colors duration-300"
      >
        <ArrowLeft className="h-5 w-5" />
        Back to Marketplace
      </button>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Product Image */}
        <div className="card-minimal glass-effect border-primary/20 overflow-hidden">
          <div className="aspect-square">
            {firstImage ? (
              <img src={firstImage} alt={product.title} className="w-full h-full object-cover" />
            ) : (
              <div className="flex items-center justify-center h-full bg-muted">
                <Package className="h-32 w-32 text-muted-foreground/30" />
              </div>
            )}
          </div>
        </div>

        {/* Product Details */}
        <div className="space-y-6">
          <div className="card-minimal glass-effect border-primary/20 p-6">
            <h1 className="text-3xl font-bold mb-4 text-foreground">
              {product.title}
            </h1>
            <div className="flex items-center gap-3 mb-6">
              <span className="px-4 py-2 rounded-lg text-sm font-semibold border border-border bg-card text-muted-foreground">
                {product.category}
              </span>
              <span className="px-4 py-2 rounded-lg text-sm font-semibold border border-border bg-card text-muted-foreground">
                {product.condition}
              </span>
            </div>

            <div className="text-4xl font-bold text-primary mb-6">
              ₹{product.price}
            </div>

            <p className="text-muted-foreground leading-relaxed">
              {product.description}
            </p>
          </div>

          {/* Seller Information */}
          <div className="card-minimal glass-effect border-primary/20 p-6">
            <h2 className="text-xl font-bold mb-6 text-foreground">Seller Information</h2>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="bg-muted rounded-full p-3">
                  <User className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Name</p>
                  <p className="font-semibold text-foreground">{sellerName}</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="bg-muted rounded-full p-3">
                  <Mail className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-medium">Email</p>
                  <p className="font-semibold text-foreground break-all">{sellerEmail}</p>
                </div>
              </div>

              {sellerPhone && (
                <div className="flex items-center gap-4">
                  <div className="bg-muted rounded-full p-3">
                    <Phone className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground font-medium">Phone</p>
                    <p className="font-semibold text-foreground">{sellerPhone}</p>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={handleContactSeller}
              disabled={contacting}
              className="w-full mt-6 bg-primary text-primary-foreground py-3 rounded-lg font-semibold hover:bg-primary/90 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {contacting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Opening Chat...
                </>
              ) : (
                <>
                  <MessageSquare className="h-5 w-5" />
                  Contact Seller
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const SellItem = ({ onBack }) => {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    category: "",
    condition: "good",
    images: []
  });

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert("Please sign in to upload images");
        setUploading(false);
        return;
      }

      const uploadedUrls = [];

      for (const file of files) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { data, error } = await supabase.storage
          .from('marketplace-images')
          .upload(fileName, file);

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
          .from('marketplace-images')
          .getPublicUrl(fileName);

        uploadedUrls.push(publicUrl);
      }

      setFormData({ ...formData, images: [...formData.images, ...uploadedUrls] });
    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to upload images: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index) => {
    setFormData({
      ...formData,
      images: formData.images.filter((_, i) => i !== index)
    });
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.description || !formData.price || !formData.category) {
      alert("Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert("Please sign in to sell items");
        setLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from("user_profiles")
        .select("college_id")
        .eq("id", user.id)
        .single();

      if (!profile) {
        alert("Profile not found");
        setLoading(false);
        return;
      }

      const { error } = await supabase.from("marketplace_items").insert({
        title: formData.title,
        description: formData.description,
        price: parseFloat(formData.price),
        category: formData.category,
        condition: formData.condition,
        images: formData.images,
        seller_id: user.id,
        college_id: profile.college_id,
        status: "active"
      });

      if (error) throw error;
      alert("Item listed successfully!");
      onBack();
    } catch (error) {
      console.error("Error:", error);
      alert("Failed to list item: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6 max-w-3xl mx-auto">
      <button 
        onClick={onBack} 
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground font-medium transition-colors duration-300"
      >
        <ArrowLeft className="h-5 w-5" />
        Back to Marketplace
      </button>

      <div className="card-minimal glass-effect border-primary/20 p-6 sm:p-8">
        <h1 className="text-3xl font-bold mb-2 text-foreground">List Your Item</h1>
        <p className="text-muted-foreground mb-8">Fill in the details to sell your item to fellow students</p>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-semibold mb-2 text-foreground">Item Title *</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="e.g., Calculus Textbook - 12th Edition"
              className="w-full px-4 py-3 rounded-lg bg-background border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all duration-300"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-foreground">Description *</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the condition, features, and any other relevant details..."
              rows={5}
              className="w-full px-4 py-3 rounded-lg bg-background border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary resize-none transition-all duration-300"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold mb-2 text-foreground">Price (₹) *</label>
              <input
                type="number"
                step="10"
                min="0"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="0"
                className="w-full px-4 py-3 rounded-lg bg-background border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all duration-300"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-foreground">Category *</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-4 py-3 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all duration-300"
              >
                <option value="">Select category...</option>
                {categories.filter(c => c.value !== "all").map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-foreground">Condition *</label>
            <select
              value={formData.condition}
              onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
              className="w-full px-4 py-3 rounded-lg bg-background border border-border text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all duration-300"
            >
              {conditions.map(cond => (
                <option key={cond.value} value={cond.value}>{cond.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2 text-foreground">Product Images</label>
            <p className="text-sm text-muted-foreground mb-3">Upload photos of your item</p>
            
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/40 transition-colors duration-300 bg-card">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
                id="image-upload"
                disabled={uploading}
              />
              <label 
                htmlFor="image-upload" 
                className="cursor-pointer flex flex-col items-center gap-3"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-12 w-12 text-muted-foreground animate-spin" />
                    <p className="font-medium text-muted-foreground">Uploading images...</p>
                  </>
                ) : (
                  <>
                    <Upload className="h-12 w-12 text-muted-foreground" />
                    <p className="font-semibold text-foreground">Click to upload images</p>
                    <p className="text-sm text-muted-foreground">PNG, JPG, GIF up to 10MB</p>
                  </>
                )}
              </label>
            </div>

            {formData.images.length > 0 && (
              <div className="grid grid-cols-3 gap-4 mt-4">
                {formData.images.map((url, idx) => (
                  <div key={idx} className="relative group">
                    <img 
                      src={url} 
                      alt={`Upload ${idx + 1}`} 
                      className="w-full h-32 object-cover rounded-lg border border-border"
                    />
                    <button
                      onClick={() => removeImage(idx)}
                      className="absolute top-2 right-2 bg-destructive text-destructive-foreground p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/90"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading || uploading}
            className="w-full bg-primary text-primary-foreground py-3 rounded-lg font-bold hover:bg-primary/90 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Listing Item..." : "List Item"}
          </button>
        </div>
      </div>
    </div>
  );
};

const MyListings = ({ onBack, onViewProduct }) => {
  const [myItems, setMyItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMyListings();
  }, []);

  const fetchMyListings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("marketplace_items")
        .select(`
          *,
          seller:user_profiles!seller_id(
            first_name,
            last_name,
            email,
            phone_number
          )
        `)
        .eq("seller_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setMyItems(data || []);
    } catch (error) {
      console.error("Failed to load listings:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (itemId) => {
    if (!confirm("Are you sure you want to delete this listing?")) return;

    try {
      const { error } = await supabase
        .from("marketplace_items")
        .delete()
        .eq("id", itemId);

      if (error) throw error;
      
      setMyItems(myItems.filter(item => item.id !== itemId));
      alert("Item deleted successfully!");
    } catch (error) {
      console.error("Delete error:", error);
      alert("Failed to delete item: " + error.message);
    }
  };

  const handleMarkAsSold = async (itemId) => {
    if (!confirm("Mark this item as sold?")) return;

    try {
      const { error } = await supabase
        .from("marketplace_items")
        .update({ status: "sold" })
        .eq("id", itemId);

      if (error) throw error;
      
      fetchMyListings();
      alert("Item marked as sold!");
    } catch (error) {
      console.error("Update error:", error);
      alert("Failed to update item: " + error.message);
    }
  };

  return (
    <div className="container mx-auto px-6 py-10">
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-white/70 hover:text-white mb-8 font-medium transition-colors duration-300"
      >
        <ArrowLeft className="h-5 w-5" />
        Back to Marketplace
      </button>

      <div className="bg-white/8 rounded-sm p-8 border border-white/15 mb-8">
        <h1 className="text-4xl font-bold mb-2 text-white">My Listings</h1>
        <p className="text-lg text-white/60">Manage your marketplace items</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-12 w-12 animate-spin text-white" />
        </div>
      ) : myItems.length === 0 ? (
        <div className="text-center py-20 bg-white/8 rounded-sm border border-white/15">
          <Package className="h-20 w-20 text-white/40 mx-auto mb-4" />
          <p className="text-2xl font-semibold mb-2 text-white">No listings yet</p>
          <p className="text-white/60 mb-6">Start selling by listing your first item!</p>
          <button
            onClick={onBack}
            className="bg-white text-black px-8 py-3 rounded-sm font-semibold hover:bg-white/90 transition-all duration-300 inline-flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            List an Item
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {myItems.map((item) => (
            <MyListingCard
              key={item.id}
              item={item}
              onDelete={handleDelete}
              onMarkAsSold={handleMarkAsSold}
              onView={() => onViewProduct(item)}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const MyListingCard = ({ item, onDelete, onMarkAsSold, onView }) => {
  const categoryStyle = categoryStyles[item.category] || categoryStyles.other;
  const firstImage = item.images && item.images.length > 0 ? item.images[0] : null;
  const isSold = item.status === "sold";

  return (
    <div className={`card-minimal glass-effect ${isSold ? 'border-border opacity-60' : 'border-primary/20'} transition-all duration-300`}>
      <div className="flex flex-col md:flex-row gap-6 p-6">
        <div 
          className="w-full md:w-48 h-48 flex-shrink-0 bg-muted rounded-lg overflow-hidden cursor-pointer"
          onClick={onView}
        >
          {firstImage ? (
            <img 
              src={firstImage} 
              alt={item.title} 
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" 
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <Package className="h-16 w-16 text-muted-foreground/30" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="flex-1 min-w-0">
              <h3 
                className="font-bold text-2xl mb-2 text-foreground cursor-pointer hover:text-primary transition-colors"
                onClick={onView}
              >
                {item.title}
              </h3>
              <div className="flex flex-wrap items-center gap-2 mb-3">
                <span className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-border bg-card text-muted-foreground">
                  {item.category}
                </span>
                <span className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-border bg-card text-muted-foreground">
                  {item.condition}
                </span>
                {isSold && (
                  <span className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-destructive/30 bg-destructive/10 text-destructive">
                    SOLD
                  </span>
                )}
              </div>
            </div>
            <div className="text-3xl font-bold text-primary">
              ₹{item.price}
            </div>
          </div>

          <p className="text-muted-foreground mb-4 line-clamp-2 leading-relaxed">
            {item.description}
          </p>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={onView}
              className="px-5 py-2.5 bg-card text-foreground rounded-lg font-semibold hover:bg-accent transition-all duration-300 flex items-center gap-2 border border-border"
            >
              <Package className="h-4 w-4" />
              View Details
            </button>
            
            {!isSold && (
              <button
                onClick={() => onMarkAsSold(item.id)}
                className="px-5 py-2.5 bg-green-500/10 text-green-600 dark:text-green-400 rounded-lg font-semibold hover:bg-green-500/20 transition-all duration-300 border border-green-500/30"
              >
                Mark as Sold
              </button>
            )}
            
            <button
              onClick={() => onDelete(item.id)}
              className="px-5 py-2.5 bg-destructive/10 text-destructive rounded-lg font-semibold hover:bg-destructive/20 transition-all duration-300 flex items-center gap-2 border border-destructive/30"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketplaceApp;