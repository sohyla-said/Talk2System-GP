import { useState, useEffect, useRef } from "react";
import { useTranslation } from "../../hooks/useTranslation";
import { fetchProfile, updateProfile, getCurrentUser } from "../../api/authApi"; 

const userForAvatar = getCurrentUser();
const DEFAULT_AVATAR = `https://ui-avatars.com/api/?name=${encodeURIComponent(userForAvatar?.full_name || "User")}&background=6366f1&color=fff&bold=true`;
export default function ProfilePage() {
  const { t, dir } = useTranslation();
  const fileInputRef = useRef(null);
  
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({ full_name: "", gender: "" });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  
  const [avatarUrl, setAvatarUrl] = useState(localStorage.getItem("user_avatar"));
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    loadProfile();
    const handleAvatarUpdate = (e) => setAvatarUrl(e.detail);
    window.addEventListener("avatar-updated", handleAvatarUpdate);
    return () => window.removeEventListener("avatar-updated", handleAvatarUpdate);
  }, []);

  const loadProfile = async () => {
    try {
      const data = await fetchProfile();
      setProfile({
        id: data.user_id,
        email: data.email,
        full_name: data.full_name,
        role: data.role,
        status: data.status,
        gender: data.gender,
        created_at: data.created_at
      });
      setFormData({ full_name: data.full_name || "", gender: data.gender || "" });
    } catch (err) {
      console.error("API Error, using local fallback:", err.message);
      const localUser = getCurrentUser();
      if (localUser) {
        setProfile({
          id: localUser.id,
          email: localUser.email,
          full_name: localUser.full_name,
          role: localUser.role,
          status: localUser.status,
          gender: localUser.gender,
          created_at: localUser.created_at
        });
        setFormData({ full_name: localUser.full_name || "", gender: localUser.gender || "" });
      } else {
        setMessage("Failed to load profile data.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      await updateProfile(formData);
      setProfile(prev => ({ ...prev, ...formData }));
      setEditing(false);
      setMessage(t("profileUpdated") || "Profile updated successfully!");
      setTimeout(() => setMessage(""), 3000);
    } catch (err) {
      setMessage(err.message);
    } finally {
      setSaving(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr || dateStr === "null" || dateStr === "undefined" || dateStr === "") {
      return new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    }
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        return new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
      }
      return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    } catch {
      return new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    }
  };

  const statusColors = {
    active: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800",
    pending: "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800",
    suspended: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400 border border-red-200 dark:border-red-800",
    terminated: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 border border-gray-300 dark:border-gray-600",
    archived: "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-500 border border-gray-300 dark:border-gray-600",
  };

  const handleAvatarClick = () => fileInputRef.current?.click();

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert("Image must be less than 2MB"); return; }
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target.result;
      localStorage.setItem("user_avatar", base64);
      setAvatarUrl(base64); 
      window.dispatchEvent(new CustomEvent("avatar-updated", { detail: base64 }));
      setDropdownOpen(false);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleRemoveAvatar = () => {
    localStorage.removeItem("user_avatar");
    setAvatarUrl(null); 
    window.dispatchEvent(new CustomEvent("avatar-updated", { detail: null }));
    setDropdownOpen(false);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <span className="material-symbols-outlined animate-spin text-5xl text-primary">progress_activity</span>
        <p className="text-sm text-gray-500 dark:text-gray-400 animate-pulse">Loading profile...</p>
      </div>
    );
  }

  return (
    <div dir={dir} className="max-w-3xl mx-auto p-4 sm:p-6 pb-12">
      
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">
          {t("myProfile") || "My Profile"}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Manage your personal information and preferences.</p>
      </div>

      {message && (
        <div className={`mb-6 p-4 rounded-xl text-sm font-semibold flex items-center gap-3 shadow-sm ${
          message.includes("failed") || message.includes("Failed") || message.includes("Error") 
            ? "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300 border border-red-200 dark:border-red-800" 
            : "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800"
        }`}>
          <span className="material-symbols-outlined text-xl">
            {message.includes("failed") || message.includes("Failed") || message.includes("Error") ? "error" : "check_circle"}
          </span>
          {message}
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700/50 overflow-hidden">        
        <div className="h-32 sm:h-36 bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 relative">
          <div className="absolute inset-0 bg-black/10 backdrop-blur-[1px]"></div>
        </div>
        <div className="px-6 sm:px-8 pb-8">
          {/* Avatar and Basic Info Header */}
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 -mt-14 mb-8 relative z-10">
            <div className="relative group">
              <div
                onClick={handleAvatarClick}
                className="w-28 h-28 rounded-2xl border-4 border-white dark:border-gray-800 bg-gray-200 dark:bg-gray-700 bg-center bg-cover shadow-2xl cursor-pointer transition-all duration-300 group-hover:scale-105 group-hover:shadow-primary/20"
                style={{ backgroundImage: `url("${avatarUrl || DEFAULT_AVATAR}")` }}
              />
              <div className="absolute inset-0 rounded-2xl bg-black/0 group-hover:bg-black/30 transition-all duration-300 flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-3xl opacity-0 group-hover:opacity-100 transition-opacity">photo_camera</span>
              </div>
              <div 
                className="absolute -bottom-1 -right-1 w-8 h-8 rounded-xl bg-primary border-3 border-white dark:border-gray-800 flex items-center justify-center cursor-pointer shadow-lg hover:scale-110 transition-transform"
                onClick={() => setDropdownOpen(!dropdownOpen)}
              >
                <span className="material-symbols-outlined text-white text-sm">edit</span>
              </div>
              {dropdownOpen && (
                <div className="absolute top-full mt-2 start-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl z-50 py-1.5 min-w-[180px] w-max">
                  <button onClick={handleAvatarClick} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <span className="material-symbols-outlined text-lg text-primary">photo_camera</span>
                    {t("changePhoto") || "Change Photo"}
                  </button>
                  {avatarUrl && (
                    <button onClick={handleRemoveAvatar} className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
                      <span className="material-symbols-outlined text-lg">delete</span>
                      {t("removePhoto") || "Remove Photo"}
                    </button>
                  )}
                </div>
              )}
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
            </div>
            <div className="text-center sm:text-start mb-2 sm:mb-0 flex-1">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white capitalize">
                {profile?.full_name || "User"}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{profile?.email}</p>
            </div>
            <div className="sm:ms-auto w-full sm:w-auto flex gap-2 justify-center sm:justify-end">
              {!editing ? (
                <button
                  onClick={() => setEditing(true)}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 transition-all shadow-md hover:shadow-lg hover:shadow-primary/25"
                >
                  <span className="material-symbols-outlined text-lg">edit</span>
                  {t("editProfile") || "Edit Profile"}
                </button>
              ) : (
                <button
                  onClick={() => { 
                    setEditing(false); 
                    setFormData({ full_name: profile.full_name || "", gender: profile.gender || "" }); 
                  }}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-sm font-bold hover:bg-gray-200 dark:hover:bg-gray-600 transition-all border border-gray-200 dark:border-gray-600"
                >
                  {t("cancel") || "Cancel"}
                </button>
              )}
            </div>
          </div>

          {/* Details Grid / Form */}
          {editing ? (
            <form onSubmit={handleSave} className="bg-gray-50 dark:bg-gray-900/50 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  {t("fullName") || "Full Name"}
                </label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-white focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  {t("gender") || "Gender"}
                </label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-600 dark:bg-gray-800 dark:text-white focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all text-sm"
                >
                  <option value="">{t("selectGender") || "Select Gender"}</option>
                  <option value="male">{t("male") || "Male"}</option>
                  <option value="female">{t("female") || "Female"}</option>
                </select>
              </div>
              <div className="flex justify-end pt-2 border-t border-gray-200 dark:border-gray-700">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-8 py-3 bg-primary text-white rounded-xl text-sm font-bold hover:bg-primary/90 transition-all shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {saving ? (
                    <span className="material-symbols-outlined animate-spin text-lg">progress_activity</span>
                  ) : (
                    <span className="material-symbols-outlined text-lg">save</span>
                  )}
                  {t("saveChanges") || "Save Changes"}
                </button>
              </div>
            </form>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoRow label={t("email") || "Email"} value={profile?.email} icon="email" noCapitalize />              
              <InfoRow 
                label={t("gender") || "Gender"} 
                value={profile?.gender ? (profile.gender === "male" ? (t("male") || "Male") : (t("female") || "Female")) : "Not specified"} 
                icon="wc" 
              />
              <InfoRow label={t("role") || "Role"} value={profile?.role?.replace("_", " ")} icon="shield_person" />
              <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-600/50">
                <div className="p-2.5 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg text-indigo-600 dark:text-indigo-400">
                  <span className="material-symbols-outlined text-xl">calendar_month</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{t("dateJoined") || "Date Joined"}</p>
                  <p className="text-sm font-bold text-gray-800 dark:text-white truncate">{formatDate(profile?.created_at)}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-600/50">
                <div className="p-2.5 bg-gray-100 dark:bg-gray-600/30 rounded-lg text-gray-600 dark:text-gray-400">
                  <span className="material-symbols-outlined text-xl">verified_user</span>
                </div>
                <div className="flex-1 min-w-0 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{t("accountStatus") || "Account Status"}</p>
                  </div>
                  <span className={`text-xs font-bold px-3 py-1.5 rounded-lg capitalize flex items-center gap-1.5 ${statusColors[profile?.status] || "bg-gray-100 text-gray-600"}`}>
                    {/* Pulsing dot for active status */}
                    {profile?.status === "active" && (
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                    )}
                    {profile?.status}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, icon, noCapitalize }) {
  return (
    <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-600/50 transition-all hover:shadow-sm">
      <div className="p-2.5 bg-primary/10 dark:bg-primary/20 rounded-lg text-primary">
        <span className="material-symbols-outlined text-xl">{icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{label}</p>
        <p className={`text-sm font-bold text-gray-800 dark:text-white truncate ${noCapitalize ? "" : "capitalize"}`}>
          {value || "—"}
        </p>
      </div>
    </div>
  );
}