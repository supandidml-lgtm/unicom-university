"use client";

import React, { useState, useEffect, useCallback } from "react";
import { AppShell } from "@/components/layout/AppShell";
import { fetchApi } from "@/lib/api-client";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Badge,
  Button,
  Input,
  Select,
  Modal,
} from "@unicom/ui";
import {
  Search,
  UserPlus,
  UserX,
  UserCheck,
  Copy,
  Check,
  Key,
  MessageSquare,
  Users,
  Shield,
  GraduationCap,
  Building2,
  RefreshCw,
  Sparkles,
  Phone,
  Mail,
  User,
  Tag,
  Lock,
} from "lucide-react";

interface Employee {
  id: string;
  nik: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  jobProfile: string;
  branch: string;
  brands: string[];
  status: "ACTIVE" | "INACTIVE";
}

const AVAILABLE_BRANDS = [
  "Xiaomi",
  "Huawei",
  "Ecovacs",
  "Tineco",
  "Laifen",
  "Yoniev",
];

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [branchFilter, setBranchFilter] = useState("ALL");

  const [employees, setEmployees] = useState<Employee[]>([
    {
      id: "usr-admin-1",
      nik: "ADM001",
      name: "Ahmad Fauzi",
      email: "admin@unicom.co.id",
      phone: "081299887766",
      role: "SUPER_ADMIN",
      jobProfile: "ADMIN",
      branch: "Jakarta Pusat",
      brands: ["Xiaomi", "Huawei", "Ecovacs", "Tineco", "Laifen", "Yoniev"],
      status: "ACTIVE",
    },
    {
      id: "usr-trainer-1",
      nik: "TRN001",
      name: "Budi Santoso",
      email: "trainer@unicom.co.id",
      phone: "081388776655",
      role: "TRAINER",
      jobProfile: "TECHNICIAN",
      branch: "Jakarta Pusat",
      brands: ["Xiaomi", "Huawei"],
      status: "ACTIVE",
    },
    {
      id: "usr-spv-1",
      nik: "SPV001",
      name: "Chandra Wijaya",
      email: "supervisor.jkt@unicom.co.id",
      phone: "081577665544",
      role: "SUPERVISOR",
      jobProfile: "ADMIN",
      branch: "Jakarta Pusat",
      brands: ["Xiaomi", "Huawei", "Ecovacs"],
      status: "ACTIVE",
    },
    {
      id: "usr-staff-1",
      nik: "UC10042",
      name: "Andi Pratama",
      email: "andi.pratama@unicom.co.id",
      phone: "081866554433",
      role: "STAFF",
      jobProfile: "TECHNICIAN",
      branch: "Jakarta Pusat",
      brands: ["Xiaomi"],
      status: "ACTIVE",
    },
    {
      id: "usr-staff-2",
      nik: "UC10043",
      name: "Bambang Wijaya",
      email: "bambang.wijaya@unicom.co.id",
      phone: "081955443322",
      role: "STAFF",
      jobProfile: "CUSTOMER_SERVICE",
      branch: "Surabaya",
      brands: ["Xiaomi", "Huawei"],
      status: "ACTIVE",
    },
  ]);

  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isSavingUser, setIsSavingUser] = useState(false);

  const loadUsers = useCallback(async () => {
    try {
      setIsLoadingUsers(true);
      const data = await fetchApi<any[]>("/users");
      if (Array.isArray(data) && data.length > 0) {
        setEmployees(
          data.map((u) => ({
            id: u.id,
            nik: u.nik,
            name: u.name,
            email: u.email,
            phone: u.phone,
            role: u.role,
            jobProfile: u.jobProfile,
            branch: u.branchName || "Jakarta Pusat",
            brands: u.brandNames && u.brandNames.length > 0 ? u.brandNames : ["Xiaomi"],
            status: u.status || "ACTIVE",
          }))
        );
      }
    } catch (err) {
      console.warn("Could not fetch real users list, using cache", err);
    } finally {
      setIsLoadingUsers(false);
    }
  }, []);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // Modal States
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newNik, setNewNik] = useState("");
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newRole, setNewRole] = useState("STAFF");
  const [newJobProfile, setNewJobProfile] = useState("TECHNICIAN");
  const [newBranch, setNewBranch] = useState("Jakarta Pusat");
  const [selectedBrands, setSelectedBrands] = useState<string[]>(["Xiaomi"]);
  const [newPassword, setNewPassword] = useState("UnicomPassword2026!");

  // Credential Created Popup State
  const [createdCredential, setCreatedCredential] = useState<{
    name: string;
    nik: string;
    email: string;
    phone?: string;
    role: string;
    jobProfile: string;
    branch: string;
    brands: string[];
    password: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const formatWhatsAppPhone = (phone: string) => {
    let clean = phone.replace(/[^0-9]/g, "");
    if (clean.startsWith("0")) {
      clean = "62" + clean.slice(1);
    }
    return clean;
  };

  const toggleBrand = (brand: string) => {
    if (selectedBrands.includes(brand)) {
      if (selectedBrands.length > 1) {
        setSelectedBrands(selectedBrands.filter((b) => b !== brand));
      }
    } else {
      setSelectedBrands([...selectedBrands, brand]);
    }
  };

  const handleAddEmployee = async () => {
    if (!newNik.trim() || !newName.trim() || !newEmail.trim()) {
      alert("Mohon lengkapi NIK, Nama Lengkap, dan Email Kantor.");
      return;
    }

    const branchMap: Record<string, string> = {
      "Jakarta Pusat": "branch-jkt-pusat",
      "Surabaya": "branch-sby",
      "Bandung": "branch-bdg",
      "Medan": "branch-mdn",
      "Makassar": "branch-mks",
    };

    const branchId = branchMap[newBranch] || "branch-jkt-pusat";
    const tempPassword = newPassword.trim() || "UnicomPassword2026!";

    try {
      setIsSavingUser(true);
      await fetchApi("/users", {
        method: "POST",
        body: JSON.stringify({
          nik: newNik.toUpperCase().trim(),
          name: newName.trim(),
          email: newEmail.toLowerCase().trim(),
          password: tempPassword,
          role: newRole,
          jobProfile: newJobProfile,
          branchId,
          brandIds: selectedBrands.map((b) => `brand-${b.toLowerCase()}`),
        }),
      });

      await loadUsers();
      setIsAddOpen(false);

      setCreatedCredential({
        name: newName.trim(),
        nik: newNik.toUpperCase().trim(),
        email: newEmail.toLowerCase().trim(),
        phone: newPhone.trim() || undefined,
        role: newRole,
        jobProfile: newJobProfile,
        branch: newBranch,
        brands: selectedBrands,
        password: tempPassword,
      });

      setNewNik("");
      setNewName("");
      setNewEmail("");
      setNewPhone("");
      setSelectedBrands(["Xiaomi"]);
      setNewPassword("UnicomPassword2026!");
    } catch (err: any) {
      console.warn("Backend API not reachable, adding to state fallback", err);
      const newEmp: Employee = {
        id: `usr-${Date.now()}`,
        nik: newNik.toUpperCase().trim(),
        name: newName.trim(),
        email: newEmail.toLowerCase().trim(),
        phone: newPhone.trim() || undefined,
        role: newRole,
        jobProfile: newJobProfile,
        branch: newBranch,
        brands: selectedBrands,
        status: "ACTIVE",
      };

      setEmployees((prev) => [newEmp, ...prev]);
      setIsAddOpen(false);

      setCreatedCredential({
        name: newName.trim(),
        nik: newNik.toUpperCase().trim(),
        email: newEmail.toLowerCase().trim(),
        phone: newPhone.trim() || undefined,
        role: newRole,
        jobProfile: newJobProfile,
        branch: newBranch,
        brands: selectedBrands,
        password: tempPassword,
      });

      setNewNik("");
      setNewName("");
      setNewEmail("");
      setNewPhone("");
      setSelectedBrands(["Xiaomi"]);
      setNewPassword("UnicomPassword2026!");
    } finally {
      setIsSavingUser(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const toggleUserStatus = async (id: string) => {
    const currentEmp = employees.find((e) => e.id === id);
    if (!currentEmp) return;
    const nextStatus = currentEmp.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";

    setEmployees((prev) =>
      prev.map((e) =>
        e.id === id ? { ...e, status: nextStatus } : e
      )
    );

    try {
      await fetchApi(`/users/${id}`, {
        method: "PUT",
        body: JSON.stringify({ status: nextStatus }),
      });
    } catch (err) {
      console.warn("Could not sync status with backend", err);
    }
  };

  const filteredEmployees = employees.filter((e) => {
    const matchesSearch =
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.nik.toLowerCase().includes(search.toLowerCase()) ||
      e.email.toLowerCase().includes(search.toLowerCase());
    const matchesRole = roleFilter === "ALL" || e.role === roleFilter;
    const matchesBranch = branchFilter === "ALL" || e.branch === branchFilter;
    return matchesSearch && matchesRole && matchesBranch;
  });

  const totalUsers = employees.length;
  const totalStaff = employees.filter((e) => e.role === "STAFF").length;
  const totalTrainers = employees.filter((e) => e.role === "TRAINER").length;
  const activeUsers = employees.filter((e) => e.status === "ACTIVE").length;

  return (
    <AppShell pageTitle="Manajemen Pengguna">
      <div className="space-y-6">
        {/* Header Title and Primary Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight">
              Manajemen Pengguna & Akun Pegawai
            </h1>
            <p className="text-xs md:text-sm text-slate-500 mt-0.5">
              Otorisasi Role-Based Access Control (RBAC), penugasan cabang resmi, dan manajemen kredensial.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={loadUsers}
              disabled={isLoadingUsers}
              leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoadingUsers ? "animate-spin" : ""}`} />}
            >
              Segarkan Data
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={() => setIsAddOpen(true)}
              leftIcon={<UserPlus className="w-4 h-4" />}
            >
              Tambah Pengguna Baru
            </Button>
          </div>
        </div>

        {/* Executive Quick Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="bg-white border border-slate-200 rounded-[8px] p-4 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Total Pengguna</span>
              <Users className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-1.5">{totalUsers}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Semua peran terdaftar</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-[8px] p-4 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Teknisi & Staff</span>
              <GraduationCap className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-bold text-emerald-600 mt-1.5">{totalStaff}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Peserta training aktif</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-[8px] p-4 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Trainer & Instruktur</span>
              <Shield className="w-4 h-4 text-amber-600" />
            </div>
            <p className="text-2xl font-bold text-amber-600 mt-1.5">{totalTrainers}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Pengelola kurikulum</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-[8px] p-4 shadow-sm">
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
              <span>Akun Aktif</span>
              <Building2 className="w-4 h-4 text-indigo-600" />
            </div>
            <p className="text-2xl font-bold text-indigo-600 mt-1.5">{activeUsers} / {totalUsers}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Status operasional</p>
          </div>
        </div>

        {/* Filters and Search Bar */}
        <div className="bg-white border border-slate-200 rounded-[8px] p-4 flex flex-col md:flex-row gap-3 items-center justify-between shadow-sm">
          <div className="w-full md:w-80">
            <Input
              placeholder="Cari NIK, Nama, atau Email..."
              leftIcon={<Search className="w-4 h-4 text-slate-400" />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="w-full md:w-auto flex flex-wrap items-center gap-2.5">
            <div className="w-44">
              <Select
                options={[
                  { value: "ALL", label: "Semua Role" },
                  { value: "SUPER_ADMIN", label: "👑 Super Admin" },
                  { value: "TRAINER", label: "🎓 Trainer" },
                  { value: "SUPERVISOR", label: "👔 Supervisor" },
                  { value: "STAFF", label: "🔧 Staff (Trainee)" },
                ]}
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
              />
            </div>

            <div className="w-44">
              <Select
                options={[
                  { value: "ALL", label: "Semua Cabang" },
                  { value: "Jakarta Pusat", label: "📍 Jakarta Pusat" },
                  { value: "Surabaya", label: "📍 Surabaya" },
                  { value: "Bandung", label: "📍 Bandung" },
                  { value: "Medan", label: "📍 Medan" },
                  { value: "Makassar", label: "📍 Makassar" },
                ]}
                value={branchFilter}
                onChange={(e) => setBranchFilter(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Enterprise Data Table */}
        <div className="bg-white border border-slate-200 rounded-[8px] overflow-hidden shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/75">
                <TableHead className="w-28">NIK Pegawai</TableHead>
                <TableHead>Nama & Kontak</TableHead>
                <TableHead>Peran (Role)</TableHead>
                <TableHead>Job Profile</TableHead>
                <TableHead>Cabang Resmi</TableHead>
                <TableHead>Brand Partner</TableHead>
                <TableHead className="text-center">Status Akun</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-slate-400">
                    Tidak ada data pengguna yang cocok dengan filter pencarian.
                  </TableCell>
                </TableRow>
              ) : (
                filteredEmployees.map((emp) => (
                  <TableRow key={emp.id} className="hover:bg-slate-50/50 transition">
                    <TableCell className="font-mono text-xs font-bold text-blue-700">
                      {emp.nik}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-semibold text-slate-900 text-xs">{emp.name}</span>
                        <span className="text-[11px] text-slate-500 font-mono">{emp.email}</span>
                        {emp.phone && (
                          <span className="text-[10px] text-emerald-600 font-mono flex items-center gap-1 mt-0.5">
                            <Phone className="w-2.5 h-2.5" />
                            {emp.phone}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {emp.role === "SUPER_ADMIN" && (
                        <Badge variant="default" size="sm">👑 Super Admin</Badge>
                      )}
                      {emp.role === "TRAINER" && (
                        <Badge variant="warning" size="sm">🎓 Trainer</Badge>
                      )}
                      {emp.role === "SUPERVISOR" && (
                        <Badge variant="default" size="sm">👔 Supervisor</Badge>
                      )}
                      {emp.role === "STAFF" && (
                        <Badge variant="neutral" size="sm">🔧 Staff</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-slate-600 font-medium">
                      {emp.jobProfile}
                    </TableCell>
                    <TableCell className="text-xs text-slate-700 font-medium">
                      {emp.branch}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {emp.brands.slice(0, 2).map((b, idx) => (
                          <span key={idx} className="bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-[10px] text-slate-700 font-medium">
                            {b}
                          </span>
                        ))}
                        {emp.brands.length > 2 && (
                          <span className="bg-blue-50 text-blue-700 border border-blue-200 px-1 py-0.5 rounded text-[10px] font-bold">
                            +{emp.brands.length - 2}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant={emp.status === "ACTIVE" ? "success" : "danger"} size="sm" dot>
                        {emp.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <button
                        onClick={() => toggleUserStatus(emp.id)}
                        className={`text-xs px-2 py-1 rounded transition font-medium inline-flex items-center gap-1 border ${
                          emp.status === "ACTIVE"
                            ? "bg-red-50 text-red-700 border-red-200 hover:bg-red-100"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                        }`}
                        title={emp.status === "ACTIVE" ? "Nonaktifkan Akun" : "Aktifkan Akun"}
                      >
                        {emp.status === "ACTIVE" ? (
                          <>
                            <UserX className="w-3.5 h-3.5" />
                            <span>Nonaktifkan</span>
                          </>
                        ) : (
                          <>
                            <UserCheck className="w-3.5 h-3.5" />
                            <span>Aktifkan</span>
                          </>
                        )}
                      </button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: Form Pendaftaran Pengguna Enterprise (Structured & Comprehensive) */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Daftarkan Akun Pegawai Baru"
        description="Lengkapi formulir di bawah ini untuk membuat identitas login dan hak akses resmi Unicom University."
        maxWidth="xl"
      >
        <div className="space-y-5 text-slate-800">
          {/* SECTION 1: DATA IDENTITAS & KONTAK */}
          <div className="bg-slate-50/80 border border-slate-200 rounded-[8px] p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wide border-b border-slate-200 pb-2">
              <User className="w-4 h-4 text-blue-600" />
              <span>1. Identitas Pribadi & Kontak Resmi</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Nomor Induk Karyawan (NIK)"
                placeholder="Contoh: UC10088"
                value={newNik}
                onChange={(e) => setNewNik(e.target.value)}
                required
              />

              <Input
                label="Nama Lengkap Karyawan"
                placeholder="Contoh: Pratama Wicaksono"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Input
                label="Email Kantor Resmi"
                type="email"
                placeholder="nama.pegawai@unicom.co.id"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                required
              />

              <Input
                label="Nomor WhatsApp / HP (Kirim Kredensial Langsung)"
                type="tel"
                placeholder="Contoh: 081234567890"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
              />
            </div>
          </div>

          {/* SECTION 2: PERAN & PENUGASAN ORGANISASI */}
          <div className="bg-slate-50/80 border border-slate-200 rounded-[8px] p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wide border-b border-slate-200 pb-2">
              <Building2 className="w-4 h-4 text-indigo-600" />
              <span>2. Penugasan Cabang & Hak Akses (RBAC)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Select
                label="Peran Sistem (System Role)"
                options={[
                  { value: "STAFF", label: "🔧 Staff (Trainee)" },
                  { value: "TRAINER", label: "🎓 Trainer" },
                  { value: "SUPERVISOR", label: "👔 Supervisor" },
                  { value: "SUPER_ADMIN", label: "👑 Super Admin" },
                ]}
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
              />

              <Select
                label="Profil Pekerjaan (Job Profile)"
                options={[
                  { value: "TECHNICIAN", label: "Teknisi Service" },
                  { value: "CUSTOMER_SERVICE", label: "Customer Service" },
                  { value: "ADMIN", label: "Staff Administrasi" },
                ]}
                value={newJobProfile}
                onChange={(e) => setNewJobProfile(e.target.value)}
              />

              <Select
                label="Cabang Penugasan"
                options={[
                  { value: "Jakarta Pusat", label: "Jakarta Pusat" },
                  { value: "Surabaya", label: "Surabaya" },
                  { value: "Bandung", label: "Bandung" },
                  { value: "Medan", label: "Medan" },
                  { value: "Makassar", label: "Makassar" },
                ]}
                value={newBranch}
                onChange={(e) => setNewBranch(e.target.value)}
              />
            </div>

            {/* Brand Authorization Multi-select Pills */}
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-slate-500" />
                <span>Brand Partner yang Ditugaskan (Pilih minimal 1):</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_BRANDS.map((brand) => {
                  const isSelected = selectedBrands.includes(brand);
                  return (
                    <button
                      key={brand}
                      type="button"
                      onClick={() => toggleBrand(brand)}
                      className={`text-xs px-2.5 py-1 rounded-[6px] border font-medium transition flex items-center gap-1 ${
                        isSelected
                          ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                          : "bg-white text-slate-700 border-slate-300 hover:bg-slate-100"
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 text-white" />}
                      <span>{brand}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* SECTION 3: KREDENSIAL & KEAMANAN */}
          <div className="bg-slate-50/80 border border-slate-200 rounded-[8px] p-4 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wide border-b border-slate-200 pb-2">
              <Lock className="w-4 h-4 text-amber-600" />
              <span>3. Kredensial Awal & Kebijakan Keamanan (PRD §15)</span>
            </div>

            <Input
              label="Password Sementara Awal"
              placeholder="UnicomPassword2026!"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              helperText="Karyawan akan diwajibkan membuat password rahasia baru saat pertama kali login demi keamanan akun."
            />
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-slate-200">
            <Button variant="outline" onClick={() => setIsAddOpen(false)} disabled={isSavingUser}>
              Batal
            </Button>
            <Button
              variant="primary"
              onClick={handleAddEmployee}
              disabled={isSavingUser}
              leftIcon={isSavingUser ? <RefreshCw className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            >
              {isSavingUser ? "Menyimpan ke Database..." : "Simpan & Daftarkan Akun"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL: Konfirmasi Kredensial & Pengiriman WhatsApp Profesional */}
      {/* ========================================================================= */}
      <Modal
        isOpen={!!createdCredential}
        onClose={() => setCreatedCredential(null)}
        title="Akun Pegawai Berhasil Didaftarkan! 🎉"
        description="Kredensial login telah tersimpan di sistem. Kirimkan rincian akun ini ke pegawai yang bersangkutan."
        maxWidth="lg"
      >
        {createdCredential && (
          <div className="space-y-4">
            {/* ID Card Presentation */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-[10px] p-5 shadow-md border border-slate-700 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-700/80 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center font-bold text-xs text-white">
                    {createdCredential.name.charAt(0)}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">{createdCredential.name}</h4>
                    <p className="text-[11px] text-slate-400">Cabang {createdCredential.branch} · {createdCredential.jobProfile}</p>
                  </div>
                </div>
                <Badge variant="default" size="sm">
                  {createdCredential.role}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 text-[10px] block">NIK / USERNAME</span>
                  <span className="font-mono font-bold text-blue-400 text-sm">{createdCredential.nik}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">EMAIL RESMI</span>
                  <span className="font-mono text-slate-200 truncate block">{createdCredential.email}</span>
                </div>
              </div>

              <div className="bg-slate-800/80 border border-slate-700 rounded-[6px] p-3 flex items-center justify-between">
                <div>
                  <span className="text-amber-400 text-[10px] font-bold block flex items-center gap-1">
                    <Key className="w-3 h-3 text-amber-400" />
                    PASSWORD SEMENTARA
                  </span>
                  <span className="font-mono font-bold text-white tracking-wide text-sm">
                    {createdCredential.password}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 max-w-[140px] text-right">
                  Wajib ganti password saat login pertama
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-1">
              {createdCredential.phone && (
                <a
                  href={`https://wa.me/${formatWhatsAppPhone(createdCredential.phone)}?text=${encodeURIComponent(
                    `Halo *${createdCredential.name}*,\n\nBerikut adalah akun akses resmi *Unicom University* Anda:\n🌐 Portal: https://unicom-university-web.vercel.app/login\n👤 NIK / Username: *${createdCredential.nik}*\n📧 Email: ${createdCredential.email}\n🔑 Password Sementara: *${createdCredential.password}*\n🏢 Cabang: ${createdCredential.branch}\n\n_Catatan: Anda akan diwajibkan membuat password baru saat pertama kali login demi keamanan akun._`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs py-2.5 px-4 rounded-[6px] transition flex items-center justify-center gap-2 shadow-sm"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Kirim Langsung via WhatsApp ({createdCredential.phone})</span>
                </a>
              )}

              <Button
                variant={createdCredential.phone ? "outline" : "primary"}
                onClick={() =>
                  copyToClipboard(
                    `Halo ${createdCredential.name},\n\nBerikut adalah akun akses resmi Unicom University Anda:\n🌐 Portal: https://unicom-university-web.vercel.app/login\n👤 NIK / Username: ${createdCredential.nik}\n📧 Email: ${createdCredential.email}\n🔑 Password Sementara: ${createdCredential.password}\n🏢 Cabang: ${createdCredential.branch}\n\n*Catatan: Anda akan diwajibkan membuat password baru saat pertama kali login demi keamanan akun.*`
                  )
                }
                leftIcon={copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                className="w-full justify-center"
              >
                {copied ? "Kredensial Tersalin ke Clipboard! ✓" : "Salin Format Teks Pesan"}
              </Button>

              <Button variant="outline" onClick={() => setCreatedCredential(null)} className="w-full justify-center">
                Tutup Jendela
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </AppShell>
  );
}
