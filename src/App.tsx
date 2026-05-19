import { useState, useMemo, useCallback, useEffect, useRef, type FormEvent } from "react";
import {
  Heart, Search, Filter, MapPin, Briefcase, GraduationCap, Users,
  CheckCircle, Plus, X, Info, DollarSign, Utensils, Home, Star,
  User, ShieldCheck, Loader2, Camera, Pencil, Trash2, Ruler,
} from "lucide-react";
import { supabase } from "./lib/supabase";
import type { Profile } from "./data/profiles";

function matchesAge(age: number, range: string): boolean {
  if (range === "All") return true;
  if (range === "20-25") return age >= 20 && age <= 25;
  if (range === "26-30") return age >= 26 && age <= 30;
  if (range === "31+") return age >= 31;
  return true;
}

const FILTER_DEFAULTS = {
  search: "", religion: "All", ageRange: "All", location: "",
  height: "All", maritalStatus: "All", motherTongue: "All",
  manglik: "All", rashi: "All", complexion: "All", education: "All", smoking: "All", drinking: "All",
  familyType: "All", siblings: "All", familyValues: "All",
};

const RASHI_OPTIONS = [
  "Mesh (Aries)", "Vrishabh (Taurus)", "Mithun (Gemini)", "Kark (Cancer)",
  "Simha (Leo)", "Kanya (Virgo)", "Tula (Libra)", "Vrishchik (Scorpio)",
  "Dhanu (Sagittarius)", "Makar (Capricorn)", "Kumbh (Aquarius)", "Meen (Pisces)",
];

export default function App() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [shortlisted, setShortlisted] = useState<string[]>([]);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [editingProfile, setEditingProfile] = useState<Profile | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [filters, setFilters] = useState({ ...FILTER_DEFAULTS });
  const formRef = useRef<HTMLFormElement>(null);

  const fetchProfiles = useCallback(async () => {
    const { data, error } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    if (error) console.error("Error fetching profiles:", error);
    else setProfiles(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchProfiles();
    const channel = supabase.channel("profiles-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "profiles" }, (payload) => {
        setProfiles((prev) => [payload.new as Profile, ...prev]);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "profiles" }, (payload) => {
        setProfiles((prev) => prev.map((p) => (p.id === payload.new.id ? (payload.new as Profile) : p)));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "profiles" }, (payload) => {
        setProfiles((prev) => prev.filter((p) => p.id !== payload.old.id));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchProfiles]);

  const filteredProfiles = useMemo(() => {
    return profiles.filter((p) => {
      const q = filters.search.toLowerCase();
      const matchSearch = !q || p.name.toLowerCase().includes(q) || p.current_city.toLowerCase().includes(q) || p.state.toLowerCase().includes(q);
      const matchReligion = filters.religion === "All" || p.religion === filters.religion;
      const matchAge = matchesAge(p.age, filters.ageRange);
      const matchLocation = !filters.location || p.current_city.toLowerCase().includes(filters.location.toLowerCase()) || p.state.toLowerCase().includes(filters.location.toLowerCase());
      const matchHeight = filters.height === "All" || p.height === filters.height;
      const matchMarital = filters.maritalStatus === "All" || p.marital_status === filters.maritalStatus;
      const matchTongue = filters.motherTongue === "All" || p.mother_tongue === filters.motherTongue;
      const matchManglik = filters.manglik === "All" || p.manglik === filters.manglik;
      const matchRashi = filters.rashi === "All" || p.rashi === filters.rashi;
      const matchComplexion = filters.complexion === "All" || p.complexion === filters.complexion;
      const matchEducation = filters.education === "All" || (p.education && p.education.toLowerCase().includes(filters.education.toLowerCase()));
      const matchSmoking = filters.smoking === "All" || p.smoking === filters.smoking;
      const matchDrinking = filters.drinking === "All" || p.drinking === filters.drinking;
      const matchFamilyType = filters.familyType === "All" || p.family_type === filters.familyType;
      const matchSiblings = filters.siblings === "All" || p.siblings === filters.siblings;
      const matchFamilyValues = filters.familyValues === "All" || p.family_values === filters.familyValues;
      return matchSearch && matchReligion && matchAge && matchLocation && matchHeight && matchMarital && matchTongue && matchManglik && matchRashi && matchComplexion && matchEducation && matchSmoking && matchDrinking && matchFamilyType && matchSiblings && matchFamilyValues;
    });
  }, [profiles, filters]);

  const toggleShortlist = useCallback((id: string) => {
    setShortlisted((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  }, []);

  const processPhoto = (file: File) => {
    if (file.size > 5 * 1024 * 1024) { alert("Photo must be under 5MB."); return; }
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { alert("Only JPG, PNG, and WebP are allowed."); return; }
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setPhotoPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const buildProfileData = (data: Record<string, string>, imageUrl: string) => ({
    name: data.name || "", gender: data.gender || "Female", age: parseInt(data.age || "25"),
    dob: data.dob || null, height: data.height || "",
    marital_status: data.maritalStatus || "Never Married",
    mother_tongue: data.motherTongue || "", religion: data.religion || "",
    caste: data.caste || "", sub_caste: data.subCaste || "",
    education: data.education || "", college: data.college || "",
    profession: data.profession || "", company: data.company || "",
    income: data.income || "", work_location: data.workLocation || "",
    body_type: data.bodyType || "", complexion: data.complexion || "",
    diet: data.diet || "Vegetarian", drinking: data.drinking || "No",
    smoking: data.smoking || "No", hobbies: data.hobbies || "",
    physical_status: data.physicalStatus || "Normally Abled",
    family_type: data.familyType || "Nuclear",
    family_status: data.familyStatus || "Middle Class",
    father_profession: data.fatherProfession || "",
    mother_profession: data.motherProfession || "",
    siblings: data.siblings || "", native_place: data.nativePlace || "",
    family_values: data.familyValues || "Moderate",
    current_city: data.currentCity || "", state: data.state || "",
    country: data.country || "India", residency_status: data.residencyStatus || "Citizen",
    birth_time: data.birthTime || "", birth_place: data.birthPlace || "",
    manglik: data.manglik || "No", rashi: data.rashi || "",
    gothra: data.gothra || "", about: data.about || "",
    expectations: data.expectations || "", image: imageUrl, verified: data.verified === "on",
  });

  const uploadPhoto = async (): Promise<string | null> => {
    if (!photoFile) return null;
    const ext = photoFile.name.split(".").pop();
    const path = `public/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error: uploadErr } = await supabase.storage.from("profile-photos").upload(path, photoFile, { cacheControl: "3600", upsert: false });
    if (uploadErr) { console.error("Photo upload error:", uploadErr); return null; }
    const { data: urlData } = supabase.storage.from("profile-photos").getPublicUrl(path);
    return urlData.publicUrl;
  };

  const handleCreateProfile = useCallback(async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries()) as Record<string, string>;
    let imageUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name || "User")}&background=random`;
    if (photoFile) {
      const uploaded = await uploadPhoto();
      if (!uploaded) { alert("Photo upload failed."); setIsSubmitting(false); return; }
      imageUrl = uploaded;
    }
    const newProfile = buildProfileData(data, imageUrl);
    const { error } = await supabase.from("profiles").insert([newProfile]);
    if (error) console.error("Error creating profile:", error);
    resetFormState();
  }, [photoFile]);

  const handleEditProfile = useCallback(async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingProfile) return;
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries()) as Record<string, string>;
    let imageUrl = editingProfile.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name || "User")}&background=random`;
    if (photoFile) {
      const uploaded = await uploadPhoto();
      if (uploaded) imageUrl = uploaded;
    }
    const updated = buildProfileData(data, imageUrl);
    const { error } = await supabase.from("profiles").update(updated).eq("id", editingProfile.id);
    if (error) console.error("Error updating profile:", error);
    resetFormState();
    setSelectedProfile(null);
  }, [editingProfile, photoFile]);

  const handleDeleteProfile = async (id: string) => {
    const { error } = await supabase.from("profiles").delete().eq("id", id);
    if (error) console.error("Error deleting profile:", error);
    setDeleteConfirm(null);
    setSelectedProfile(null);
  };

  const resetFormState = () => {
    setPhotoFile(null); setPhotoPreview(null); setIsSubmitting(false);
    setIsModalOpen(false); setEditingProfile(null);
  };

  const openEditModal = (p: Profile) => {
    setEditingProfile(p);
    setPhotoPreview(p.image || null);
    setSelectedProfile(null);
  };

  const selectCls = "w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-rose-500 transition-colors";
  const inputCls = "w-full p-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:border-rose-500 transition-colors";
  const labelCls = "text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1 block mb-1.5";

  const uniqueValues = (key: keyof Profile) => [...new Set(profiles.map((p) => String(p[key])).filter(Boolean))].sort();

  return (
    <div className="min-h-screen bg-[#f8f9fb] text-slate-900 font-sans">
      <nav className="bg-white border-b sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-rose-500 p-2 rounded-xl text-white shadow-lg shadow-rose-200"><Heart fill="white" size={20} /></div>
            <span className="text-xl font-bold tracking-tight">Lagan<span className="text-rose-500">sha</span></span>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => { setIsModalOpen(true); setEditingProfile(null); setPhotoPreview(null); setPhotoFile(null); }} className="flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-full font-bold text-sm hover:bg-slate-800 transition-all">
              <Plus size={18} /> Register Free
            </button>
            <div className="relative p-2.5 bg-rose-50 rounded-full cursor-pointer hover:bg-rose-100 transition-colors">
              <Heart size={20} className={shortlisted.length > 0 ? "text-rose-500 fill-rose-500" : "text-rose-400"} />
              {shortlisted.length > 0 && <span className="absolute -top-1 -right-1 bg-rose-600 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold border-2 border-white">{shortlisted.length}</span>}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Filters */}
          <aside className="lg:w-72 flex-shrink-0">
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto custom-scrollbar">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-bold text-slate-800 flex items-center gap-2">
                  <Filter size={18} className="text-rose-500" /> Refine Search
                </h2>
                <button onClick={() => setFilters({ ...FILTER_DEFAULTS })} className="text-[10px] font-bold text-rose-500 uppercase tracking-widest hover:text-rose-700 transition-colors">Reset</button>
              </div>
              <div className="space-y-5">
                <div>
                  <label className={labelCls}>Search</label>
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-3 text-slate-400" />
                    <input type="text" placeholder="Name, city..." value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:border-rose-500 outline-none transition-all" />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Religion</label>
                  <select value={filters.religion} onChange={(e) => setFilters({ ...filters, religion: e.target.value })} className={selectCls}>
                    <option value="All">All Religions</option>
                    {uniqueValues("religion").map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Age Filter</label>
                  <div className="grid grid-cols-2 gap-2">
                    {["All", "20-25", "26-30", "31+"].map((range) => (
                      <button key={range} onClick={() => setFilters({ ...filters, ageRange: range })} className={`py-2 rounded-lg text-xs font-semibold transition-all border ${filters.ageRange === range ? "bg-rose-500 text-white border-rose-500" : "bg-white text-slate-600 border-slate-200 hover:border-rose-300"}`}>{range}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Location</label>
                  <input type="text" placeholder="City or state..." value={filters.location} onChange={(e) => setFilters({ ...filters, location: e.target.value })} className={selectCls} />
                </div>
                <div>
                  <label className={labelCls}>Height</label>
                  <select value={filters.height} onChange={(e) => setFilters({ ...filters, height: e.target.value })} className={selectCls}>
                    <option value="All">Any Height</option>
                    {uniqueValues("height").map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Marital Status</label>
                  <select value={filters.maritalStatus} onChange={(e) => setFilters({ ...filters, maritalStatus: e.target.value })} className={selectCls}>
                    <option value="All">Any Status</option>
                    {uniqueValues("marital_status").map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Mother Tongue</label>
                  <select value={filters.motherTongue} onChange={(e) => setFilters({ ...filters, motherTongue: e.target.value })} className={selectCls}>
                    <option value="All">Any Language</option>
                    {uniqueValues("mother_tongue").map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Manglik Status</label>
                  <select value={filters.manglik} onChange={(e) => setFilters({ ...filters, manglik: e.target.value })} className={selectCls}>
                    <option value="All">Any</option>
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                    <option value="Don't Know">Don't Know</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Rashi (Zodiac)</label>
                  <select value={filters.rashi} onChange={(e) => setFilters({ ...filters, rashi: e.target.value })} className={selectCls}>
                    <option value="All">Any Rashi</option>
                    {RASHI_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Complexion</label>
                  <select value={filters.complexion} onChange={(e) => setFilters({ ...filters, complexion: e.target.value })} className={selectCls}>
                    <option value="All">Any Complexion</option>
                    <option value="Fair">Fair</option>
                    <option value="Wheatish">Wheatish</option>
                    <option value="Wheatish Medium">Wheatish Medium</option>
                    <option value="Wheatish Brown">Wheatish Brown</option>
                    <option value="Dark">Dark</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Education</label>
                  <input type="text" placeholder="e.g. B.Tech, MBA..." value={filters.education} onChange={(e) => setFilters({ ...filters, education: e.target.value })} className={selectCls} />
                </div>
                <div>
                  <label className={labelCls}>Smoking</label>
                  <select value={filters.smoking} onChange={(e) => setFilters({ ...filters, smoking: e.target.value })} className={selectCls}>
                    <option value="All">Any</option>
                    <option value="No">No</option>
                    <option value="Occasionally">Occasionally</option>
                    <option value="Regular">Regular</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Drinking</label>
                  <select value={filters.drinking} onChange={(e) => setFilters({ ...filters, drinking: e.target.value })} className={selectCls}>
                    <option value="All">Any</option>
                    <option value="No">No</option>
                    <option value="Occasionally">Occasionally</option>
                    <option value="Regular">Regular</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Family Type</label>
                  <select value={filters.familyType} onChange={(e) => setFilters({ ...filters, familyType: e.target.value })} className={selectCls}>
                    <option value="All">Any</option>
                    <option value="Nuclear">Nuclear</option>
                    <option value="Joint">Joint</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Siblings</label>
                  <select value={filters.siblings} onChange={(e) => setFilters({ ...filters, siblings: e.target.value })} className={selectCls}>
                    <option value="All">Any</option>
                    {uniqueValues("siblings").map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Family Values</label>
                  <select value={filters.familyValues} onChange={(e) => setFilters({ ...filters, familyValues: e.target.value })} className={selectCls}>
                    <option value="All">Any</option>
                    <option value="Traditional">Traditional</option>
                    <option value="Moderate">Moderate</option>
                    <option value="Liberal">Liberal</option>
                  </select>
                </div>
              </div>
            </div>
          </aside>

          {/* Profile Listing */}
          <div className="flex-1">
            <header className="mb-8">
              <h1 className="text-3xl font-extrabold text-slate-900 mb-1 tracking-tight">Discover Your Partner</h1>
              <p className="text-slate-500">We found <span className="text-rose-600 font-bold">{filteredProfiles.length}</span> matching profiles for you.</p>
            </header>

            {loading ? (
              <div className="flex items-center justify-center py-32"><Loader2 className="animate-spin text-rose-500" size={40} /></div>
            ) : filteredProfiles.length === 0 ? (
              <div className="py-20 text-center bg-white rounded-[2rem] border-2 border-dashed border-slate-200">
                <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4"><Search size={32} className="text-slate-300" /></div>
                <h3 className="text-lg font-bold text-slate-800">No matches found</h3>
                <p className="text-slate-500 text-sm">Try broadening your search or filters.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {filteredProfiles.map((p) => (
                  <div key={p.id} className="bg-white rounded-[2rem] overflow-hidden border border-slate-200 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all group">
                    <div className="flex flex-col sm:flex-row h-full">
                      <div className="relative w-full sm:w-52 h-64 sm:h-auto overflow-hidden">
                        <img src={p.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(p.name)}&background=random`} className="w-full h-full object-cover grayscale-[20%] group-hover:grayscale-0 transition-all duration-700 group-hover:scale-105" alt={p.name} />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <button onClick={(e) => { e.stopPropagation(); toggleShortlist(p.id); }} className={`absolute top-4 right-4 p-2.5 rounded-2xl backdrop-blur-md transition-all ${shortlisted.includes(p.id) ? "bg-rose-500 text-white scale-110 shadow-lg" : "bg-white/40 text-white hover:bg-white/60"}`}>
                          <Heart size={20} fill={shortlisted.includes(p.id) ? "currentColor" : "none"} />
                        </button>
                      </div>
                      <div className="flex-1 p-6 flex flex-col justify-between">
                        <div>
                          <div className="flex justify-between items-start mb-1">
                            <h3 className="text-xl font-bold text-slate-800">{p.name}, {p.age}</h3>
                            {p.verified && <ShieldCheck size={20} className="text-blue-500" />}
                          </div>
                          <p className="text-rose-500 text-xs font-bold uppercase tracking-widest mb-4">{p.religion} &bull; {p.caste}</p>
                          <div className="grid grid-cols-1 gap-2.5 text-sm text-slate-600 mb-6">
                            <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-xl"><GraduationCap size={16} className="text-rose-400 shrink-0" /><span className="truncate font-medium">{p.education}</span></div>
                            <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-xl"><MapPin size={16} className="text-rose-400 shrink-0" /><span className="font-medium">{p.current_city}, {p.state}</span></div>
                            <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-xl"><Ruler size={16} className="text-rose-400 shrink-0" /><span className="font-medium">{p.height}</span></div>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => setSelectedProfile(p)} className="flex-1 bg-slate-900 text-white py-3 rounded-2xl font-bold text-sm hover:bg-slate-800 shadow-lg shadow-slate-200 transition-all">View Full Profile</button>
                          <button onClick={() => openEditModal(p)} className="px-4 py-3 bg-slate-100 text-slate-600 rounded-2xl hover:bg-slate-200 transition-all" title="Edit"><Pencil size={20} /></button>
                          <button onClick={() => setDeleteConfirm(p.id)} className="px-4 py-3 bg-rose-50 text-rose-500 rounded-2xl hover:bg-rose-100 transition-all" title="Delete"><Trash2 size={20} /></button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* DELETE CONFIRMATION */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center">
            <div className="w-16 h-16 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4"><Trash2 size={28} className="text-rose-500" /></div>
            <h3 className="text-lg font-bold text-slate-800 mb-2">Delete Profile?</h3>
            <p className="text-slate-500 text-sm mb-6">This action cannot be undone. The profile will be permanently removed.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-3 font-bold text-slate-500 bg-slate-100 rounded-2xl hover:bg-slate-200 transition-all">Cancel</button>
              <button onClick={() => handleDeleteProfile(deleteConfirm)} className="flex-1 py-3 bg-rose-600 text-white font-bold rounded-2xl hover:bg-rose-700 transition-all">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* FULL DETAIL MODAL */}
      {selectedProfile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md overflow-y-auto">
          <div className="bg-white rounded-[2.5rem] w-full max-w-4xl my-auto shadow-2xl relative overflow-hidden modal-enter">
            <button onClick={() => setSelectedProfile(null)} className="absolute top-6 right-6 z-10 p-2 bg-white/20 hover:bg-white/40 text-white rounded-full transition-all"><X size={24} /></button>
            <div className="relative h-64 bg-rose-600 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-rose-700 to-rose-500" />
              <div className="absolute bottom-0 left-0 right-0 p-8 flex items-end gap-8 bg-gradient-to-t from-black/40">
                <img src={selectedProfile.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedProfile.name)}&background=random`} className="w-40 h-40 rounded-[2rem] object-cover border-4 border-white shadow-2xl" alt={selectedProfile.name} />
                <div className="mb-4 text-white">
                  <div className="flex items-center gap-3 mb-1">
                    <h2 className="text-4xl font-black">{selectedProfile.name}</h2>
                    {selectedProfile.verified && <CheckCircle className="text-white fill-green-500" size={24} />}
                  </div>
                  <p className="text-rose-100 font-medium text-lg">{selectedProfile.religion} &bull; {selectedProfile.caste} &bull; {selectedProfile.age} Yrs &bull; {selectedProfile.height}</p>
                </div>
              </div>
            </div>
            <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-8 overflow-y-auto max-h-[60vh] custom-scrollbar">
              <div className="space-y-6">
                <section>
                  <h4 className="flex items-center gap-2 font-bold text-slate-800 border-b pb-2 mb-4 uppercase text-xs tracking-widest"><User size={14} className="text-rose-500" /> Basic Information</h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex justify-between"><span className="text-slate-500">Marital Status</span><span className="font-semibold">{selectedProfile.marital_status}</span></li>
                    <li className="flex justify-between"><span className="text-slate-500">Mother Tongue</span><span className="font-semibold">{selectedProfile.mother_tongue}</span></li>
                    <li className="flex justify-between"><span className="text-slate-500">Physical Status</span><span className="font-semibold">{selectedProfile.physical_status}</span></li>
                    <li className="flex justify-between"><span className="text-slate-500">Body Type</span><span className="font-semibold">{selectedProfile.body_type}</span></li>
                    <li className="flex justify-between"><span className="text-slate-500">Complexion</span><span className="font-semibold">{selectedProfile.complexion}</span></li>
                  </ul>
                </section>
                <section>
                  <h4 className="flex items-center gap-2 font-bold text-slate-800 border-b pb-2 mb-4 uppercase text-xs tracking-widest"><Utensils size={14} className="text-rose-500" /> Lifestyle</h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex justify-between"><span className="text-slate-500">Dietary Habits</span><span className="font-semibold">{selectedProfile.diet}</span></li>
                    <li className="flex justify-between"><span className="text-slate-500">Drinking</span><span className="font-semibold">{selectedProfile.drinking}</span></li>
                    <li className="flex justify-between"><span className="text-slate-500">Smoking</span><span className="font-semibold">{selectedProfile.smoking}</span></li>
                  </ul>
                </section>
              </div>
              <div className="space-y-6">
                <section>
                  <h4 className="flex items-center gap-2 font-bold text-slate-800 border-b pb-2 mb-4 uppercase text-xs tracking-widest"><GraduationCap size={14} className="text-rose-500" /> Education & Career</h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex justify-between"><span className="text-slate-500">Education</span><span className="font-semibold">{selectedProfile.education}</span></li>
                    <li className="flex justify-between"><span className="text-slate-500">College</span><span className="font-semibold">{selectedProfile.college}</span></li>
                    <li className="flex justify-between"><span className="text-slate-500">Occupation</span><span className="font-semibold">{selectedProfile.profession}</span></li>
                    <li className="flex justify-between"><span className="text-slate-500">Company</span><span className="font-semibold">{selectedProfile.company}</span></li>
                    <li className="flex justify-between"><span className="text-slate-500">Income</span><span className="font-semibold">{selectedProfile.income}</span></li>
                    <li className="flex justify-between"><span className="text-slate-500">Work Location</span><span className="font-semibold">{selectedProfile.work_location}</span></li>
                  </ul>
                </section>
                <section>
                  <h4 className="flex items-center gap-2 font-bold text-slate-800 border-b pb-2 mb-4 uppercase text-xs tracking-widest"><MapPin size={14} className="text-rose-500" /> Location</h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex justify-between"><span className="text-slate-500">Current City</span><span className="font-semibold">{selectedProfile.current_city}</span></li>
                    <li className="flex justify-between"><span className="text-slate-500">Residency</span><span className="font-semibold">{selectedProfile.residency_status}</span></li>
                  </ul>
                </section>
              </div>
              <div className="space-y-6">
                <section>
                  <h4 className="flex items-center gap-2 font-bold text-slate-800 border-b pb-2 mb-4 uppercase text-xs tracking-widest"><Home size={14} className="text-rose-500" /> Family Details</h4>
                  <ul className="space-y-2 text-sm">
                    <li className="flex justify-between"><span className="text-slate-500">Father</span><span className="font-semibold">{selectedProfile.father_profession}</span></li>
                    <li className="flex justify-between"><span className="text-slate-500">Mother</span><span className="font-semibold">{selectedProfile.mother_profession}</span></li>
                    <li className="flex justify-between"><span className="text-slate-500">Siblings</span><span className="font-semibold">{selectedProfile.siblings}</span></li>
                    <li className="flex justify-between"><span className="text-slate-500">Values</span><span className="font-semibold">{selectedProfile.family_values}</span></li>
                  </ul>
                </section>
                <section>
                  <h4 className="flex items-center gap-2 font-bold text-slate-800 border-b pb-2 mb-4 uppercase text-xs tracking-widest"><Star size={14} className="text-rose-500" /> Horoscope</h4>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div><p className="text-[10px] text-slate-400">Rashi</p><p className="font-bold">{selectedProfile.rashi}</p></div>
                    <div><p className="text-[10px] text-slate-400">Manglik</p><p className="font-bold">{selectedProfile.manglik}</p></div>
                    <div><p className="text-[10px] text-slate-400">Birth Time</p><p className="font-bold">{selectedProfile.birth_time}</p></div>
                    <div><p className="text-[10px] text-slate-400">Gothra</p><p className="font-bold">{selectedProfile.gothra}</p></div>
                  </div>
                </section>
              </div>
              <div className="col-span-1 md:col-span-3 bg-slate-50 p-6 rounded-3xl border border-slate-200">
                <div className="flex gap-8 flex-col sm:flex-row">
                  <div className="flex-1"><h5 className="font-bold text-slate-800 mb-2">About Me</h5><p className="text-slate-600 text-sm leading-relaxed italic">&ldquo;{selectedProfile.about}&rdquo;</p></div>
                  <div className="flex-1"><h5 className="font-bold text-slate-800 mb-2">Partner Expectations</h5><p className="text-slate-600 text-sm leading-relaxed">{selectedProfile.expectations}</p></div>
                </div>
              </div>
            </div>
            <div className="p-8 border-t bg-slate-50/50 flex flex-col sm:flex-row gap-4 items-center justify-between">
              <div className="flex items-center gap-2 text-slate-500 text-xs"><Info size={14} /> Only verified contacts can initiate chat.</div>
              <div className="flex gap-3 w-full sm:w-auto">
                <button onClick={() => setSelectedProfile(null)} className="flex-1 sm:flex-none px-6 py-3 font-bold text-slate-500 rounded-2xl hover:bg-slate-200 transition-colors">Maybe Later</button>
                <button onClick={() => openEditModal(selectedProfile)} className="px-6 py-3 bg-slate-900 text-white font-bold rounded-2xl hover:bg-slate-800 transition-all flex items-center gap-2"><Pencil size={16} /> Edit</button>
                <button onClick={() => { setDeleteConfirm(selectedProfile.id); }} className="px-6 py-3 bg-rose-50 text-rose-600 font-bold rounded-2xl hover:bg-rose-100 transition-all flex items-center gap-2"><Trash2 size={16} /> Delete</button>
                <button className="px-12 py-3 bg-rose-600 text-white font-bold rounded-2xl shadow-xl shadow-rose-200 hover:bg-rose-700 transition-all flex items-center justify-center gap-2"><Heart fill="white" size={18} /> Express Interest</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE / EDIT MODAL */}
      {(isModalOpen || editingProfile) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-[3rem] w-full max-w-4xl my-auto shadow-2xl relative overflow-hidden modal-enter">
            <div className="p-8 bg-slate-900 text-white">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-3xl font-black tracking-tight">{editingProfile ? "Edit Profile" : "Create Your Profile"}</h2>
                  <p className="text-slate-400 mt-1">{editingProfile ? "Update profile details below." : "Join thousands finding their Lagansha every day."}</p>
                </div>
                <button onClick={resetFormState} className="p-3 hover:bg-white/10 rounded-full transition-all"><X size={24} /></button>
              </div>
            </div>
            <form ref={formRef} onSubmit={editingProfile ? handleEditProfile : handleCreateProfile} className="p-8 overflow-y-auto max-h-[70vh]">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-3"><h3 className="font-bold text-rose-500 flex items-center gap-2"><User size={18} /> 1. Basic Information</h3></div>
                {/* Photo Upload */}
                <div className="lg:col-span-3">
                  <label htmlFor="photo-input" className={`flex flex-col items-center gap-4 p-8 bg-slate-50 border-2 border-dashed rounded-3xl cursor-pointer transition-all relative ${photoPreview ? "border-rose-400" : "border-slate-200 hover:border-rose-400 hover:bg-rose-50"}`}
                    onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("border-rose-500", "bg-rose-50"); }}
                    onDragLeave={(e) => { e.currentTarget.classList.remove("border-rose-500", "bg-rose-50"); }}
                    onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove("border-rose-500", "bg-rose-50"); const file = e.dataTransfer.files[0]; if (file && file.type.startsWith("image/")) processPhoto(file); }}>
                    <input id="photo-input" type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) processPhoto(file); }} />
                    {photoPreview ? (
                      <><img src={photoPreview} alt="Preview" className="w-28 h-28 rounded-3xl object-cover border-3 border-rose-500 shadow-lg shadow-rose-200" />
                        <div className="text-center"><p className="font-bold text-slate-800 text-sm">{photoFile?.name || "Current photo"}</p><span className="text-slate-400 text-xs">Click to change photo</span></div>
                        <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setPhotoFile(null); setPhotoPreview(editingProfile?.image || null); }} className="absolute top-3 right-3 p-1.5 bg-rose-500 text-white rounded-full hover:bg-rose-700 transition-colors"><X size={16} /></button></>
                    ) : (
                      <><div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-md"><Camera size={28} className="text-rose-500" /></div>
                        <div className="text-center"><p className="font-bold text-slate-800 text-sm">Upload Profile Photo</p><span className="text-slate-400 text-xs">Click or drag & drop (JPG, PNG, WebP - max 5MB)</span></div></>
                    )}
                  </label>
                </div>
                <div className="space-y-1"><label className={labelCls}>Full Name</label><input required name="name" defaultValue={editingProfile?.name || ""} className={inputCls} /></div>
                <div className="space-y-1"><label className={labelCls}>Gender</label><select name="gender" defaultValue={editingProfile?.gender || "Female"} className={inputCls}><option>Female</option><option>Male</option><option>Other</option></select></div>
                <div className="space-y-1"><label className={labelCls}>Date of Birth</label><input required type="date" name="dob" defaultValue={editingProfile?.dob || ""} className={inputCls} /></div>
                <div className="space-y-1"><label className={labelCls}>Age</label><input required type="number" name="age" min={18} max={70} defaultValue={editingProfile?.age || ""} className={inputCls} /></div>
                <div className="space-y-1"><label className={labelCls}>Height</label><input required name="height" defaultValue={editingProfile?.height || ""} placeholder={"e.g. 5'7\""} className={inputCls} /></div>
                <div className="space-y-1"><label className={labelCls}>Marital Status</label><select name="maritalStatus" defaultValue={editingProfile?.marital_status || "Never Married"} className={inputCls}><option>Never Married</option><option>Divorced</option><option>Widowed</option><option>Awaiting Divorce</option></select></div>
                <div className="space-y-1"><label className={labelCls}>Religion</label><input required name="religion" defaultValue={editingProfile?.religion || ""} placeholder="e.g. Hindu" className={inputCls} /></div>
                <div className="space-y-1"><label className={labelCls}>Caste & Sub-Caste</label><input required name="caste" defaultValue={editingProfile?.caste || ""} placeholder="e.g. Brahmin, Saraswat" className={inputCls} /></div>
                <div className="space-y-1"><label className={labelCls}>Mother Tongue</label><input required name="motherTongue" defaultValue={editingProfile?.mother_tongue || ""} className={inputCls} /></div>
                <div className="lg:col-span-3 mt-6"><h3 className="font-bold text-rose-500 flex items-center gap-2"><GraduationCap size={18} /> 2. Education & Career</h3></div>
                <div className="space-y-1"><label className={labelCls}>Highest Qualification</label><input required name="education" defaultValue={editingProfile?.education || ""} placeholder="e.g. B.Tech, MBA" className={inputCls} /></div>
                <div className="space-y-1"><label className={labelCls}>College Name</label><input name="college" defaultValue={editingProfile?.college || ""} className={inputCls} /></div>
                <div className="space-y-1"><label className={labelCls}>Profession</label><input required name="profession" defaultValue={editingProfile?.profession || ""} placeholder="e.g. Software Engineer" className={inputCls} /></div>
                <div className="space-y-1"><label className={labelCls}>Company Name</label><input name="company" defaultValue={editingProfile?.company || ""} className={inputCls} /></div>
                <div className="space-y-1"><label className={labelCls}>Annual Income</label><input name="income" defaultValue={editingProfile?.income || ""} placeholder="e.g. 15-20 LPA" className={inputCls} /></div>
                <div className="lg:col-span-3 mt-6"><h3 className="font-bold text-rose-500 flex items-center gap-2"><Utensils size={18} /> 3. Appearance & Lifestyle</h3></div>
                <div className="space-y-1"><label className={labelCls}>Complexion</label><select name="complexion" defaultValue={editingProfile?.complexion || ""} className={inputCls}><option value="">Select Complexion</option><option>Fair</option><option>Wheatish</option><option>Wheatish Medium</option><option>Wheatish Brown</option><option>Dark</option></select></div>
                <div className="space-y-1"><label className={labelCls}>Dietary Habits</label><select name="diet" defaultValue={editingProfile?.diet || "Vegetarian"} className={inputCls}><option>Vegetarian</option><option>Non-Vegetarian</option><option>Vegan</option><option>Eggetarian</option></select></div>
                <div className="space-y-1"><label className={labelCls}>Drinking Habits</label><select name="drinking" defaultValue={editingProfile?.drinking || "No"} className={inputCls}><option>No</option><option>Occasionally</option><option>Regular</option></select></div>
                <div className="space-y-1"><label className={labelCls}>Smoking Habits</label><select name="smoking" defaultValue={editingProfile?.smoking || "No"} className={inputCls}><option>No</option><option>Occasionally</option><option>Regular</option></select></div>
                <div className="space-y-1"><label className={labelCls}>Physical Status</label><select name="physicalStatus" defaultValue={editingProfile?.physical_status || "Normally Abled"} className={inputCls}><option>Normally Abled</option><option>Differently Abled</option></select></div>
                <div className="space-y-1"><label className={labelCls}>Manglik Status</label><select name="manglik" defaultValue={editingProfile?.manglik || "No"} className={inputCls}><option>No</option><option>Yes</option><option>Don't Know</option></select></div>
                <div className="lg:col-span-3 mt-6"><h3 className="font-bold text-rose-500 flex items-center gap-2"><Home size={18} /> 4. Family Background</h3></div>
                <div className="space-y-1"><label className={labelCls}>Father's Profession</label><input name="fatherProfession" defaultValue={editingProfile?.father_profession || ""} placeholder="e.g. Retired, Business" className={inputCls} /></div>
                <div className="space-y-1"><label className={labelCls}>Mother's Profession</label><input name="motherProfession" defaultValue={editingProfile?.mother_profession || ""} placeholder="e.g. Homemaker, Teacher" className={inputCls} /></div>
                <div className="space-y-1"><label className={labelCls}>Siblings</label><input name="siblings" defaultValue={editingProfile?.siblings || ""} placeholder="e.g. 1 Brother, 2 Sisters" className={inputCls} /></div>
                <div className="space-y-1"><label className={labelCls}>Family Type</label><select name="familyType" defaultValue={editingProfile?.family_type || "Nuclear"} className={inputCls}><option>Nuclear</option><option>Joint</option></select></div>
                <div className="space-y-1"><label className={labelCls}>Family Status</label><select name="familyStatus" defaultValue={editingProfile?.family_status || "Middle Class"} className={inputCls}><option>Middle Class</option><option>Upper Middle Class</option><option>Wealthy</option></select></div>
                <div className="space-y-1"><label className={labelCls}>Family Values</label><select name="familyValues" defaultValue={editingProfile?.family_values || "Moderate"} className={inputCls}><option>Traditional</option><option>Moderate</option><option>Liberal</option></select></div>
                <div className="lg:col-span-3 mt-6"><h3 className="font-bold text-rose-500 flex items-center gap-2"><MapPin size={18} /> 5. Location Details</h3></div>
                <div className="space-y-1"><label className={labelCls}>Current City</label><input required name="currentCity" defaultValue={editingProfile?.current_city || ""} className={inputCls} /></div>
                <div className="space-y-1"><label className={labelCls}>State & Country</label><input required name="state" defaultValue={editingProfile?.state || ""} placeholder="e.g. Karnataka, India" className={inputCls} /></div>
                <div className="lg:col-span-3 mt-6"><h3 className="font-bold text-rose-500 flex items-center gap-2"><Star size={18} /> 6. Horoscope (Optional)</h3></div>
                <div className="space-y-1">
                  <label className={labelCls}>Rashi (Zodiac)</label>
                  <select name="rashi" defaultValue={editingProfile?.rashi || ""} className={inputCls}>
                    <option value="">Select Rashi</option>
                    {RASHI_OPTIONS.map((r) => <option key={r} value={r}>{r}</option>)}
                  </select>
                </div>
                <div className="space-y-1"><label className={labelCls}>Birth Time</label><input name="birthTime" defaultValue={editingProfile?.birth_time || ""} className={inputCls} /></div>
                <div className="space-y-1"><label className={labelCls}>Gothra</label><select name="gothra" defaultValue={editingProfile?.gothra || ""} className={inputCls}><option value="">Select Gothra</option><option>Atri</option><option>Bharadvaja</option><option>Jamadagni</option><option>Gautama</option><option>Kashyapa</option><option>Vashishtha</option><option>Vishvamitra</option><option>Agastya</option></select></div>
                <div className="lg:col-span-3 mt-6"><h3 className="font-bold text-rose-500 flex items-center gap-2"><Info size={18} /> 7. Bio & Expectations</h3></div>
                <div className="lg:col-span-2 space-y-1"><label className={labelCls}>About Me</label><textarea required name="about" rows={4} defaultValue={editingProfile?.about || ""} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-rose-500 transition-colors resize-none" placeholder="Share your personality, outlook on life..." /></div>
                <div className="lg:col-span-1 space-y-1"><label className={labelCls}>Partner Expectations</label><textarea required name="expectations" rows={4} defaultValue={editingProfile?.expectations || ""} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-rose-500 transition-colors resize-none" placeholder="Age, education, etc." /></div>
                <div className="lg:col-span-3 mt-6">
                  <label className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-2xl cursor-pointer hover:bg-blue-100 transition-colors w-fit">
                    <input
                      type="checkbox"
                      name="verified"
                      defaultChecked={editingProfile?.verified || false}
                      className="w-5 h-5 rounded accent-blue-500 cursor-pointer"
                    />
                    <div>
                      <p className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                        <ShieldCheck size={16} className="text-blue-500" /> Verified Account
                      </p>
                      <p className="text-xs text-slate-500">Mark this profile as verified (shows blue badge)</p>
                    </div>
                  </label>
                </div>
                <div className="lg:col-span-3 mt-10 flex flex-col sm:flex-row gap-4 pt-6 border-t">
                  <button type="button" onClick={resetFormState} className="flex-1 py-4 font-bold text-slate-500 bg-slate-100 rounded-2xl hover:bg-slate-200 transition-all">Cancel</button>
                  <button type="submit" disabled={isSubmitting} className="flex-[2] py-4 bg-rose-600 text-white font-bold rounded-2xl shadow-xl shadow-rose-200 hover:bg-rose-700 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                    {isSubmitting ? <><Loader2 size={18} className="animate-spin" />{editingProfile ? "Saving..." : "Creating..."}</> : (editingProfile ? "Save Changes" : "Create Profile")}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      <footer className="max-w-7xl mx-auto px-4 py-12 text-center text-slate-400 text-sm">
        <p>&copy; 2024 Lagansha. All profiles are manually verified for your safety.</p>
      </footer>
    </div>
  );
}
