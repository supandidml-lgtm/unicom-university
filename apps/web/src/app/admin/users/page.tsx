"use client";

import React, { useState } from "react";
import { AppShell } from "@/components/layout/AppShell";
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
} from "lucide-react";

interface Employee {
  id: string;
  nik: string;
  name: string;
  email: string;
  role: string;
  jobProfile: string;
  branch: string;
  brands: string[];
  status: "ACTIVE" | "INACTIVE";
}

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
      role: "STAFF",
      jobProfile: "CUSTOMER_SERVICE",
      branch: "Surabaya",
      brands: ["Xiaomi"],
      status: "ACTIVE",
    },
    {
      id: "usr-staff-3",
      nik: "UC10044",
      name: "Citra Lestari",
      email: "citra.lestari@unicom.co.id",
      role: "STAFF",
      jobProfile: "CUSTOMER_SERVICE",
      branch: "Bandung",
      brands: ["Ecovacs"],
      status: "ACTIVE",
    },
  ]);

  // Modal States
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newNik, setNewNik] = useState("");
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState("STAFF");
  const [newBranch, setNewBranch] = useState("Jakarta Pusat");

  const handleAddEmployee = () => {
    if (!newNik.trim() || !newName.trim() || !newEmail.trim()) {
      alert("Mohon lengkapi NIK, Nama, dan Email.");
      return;
    }

    const newEmp: Employee = {
      id: `usr-${Date.now()}`,
      nik: newNik.toUpperCase().trim(),
      name: newName.trim(),
      email: newEmail.toLowerCase().trim(),
      role: newRole,
      jobProfile: newRole === "STAFF" ? "TECHNICIAN" : "ADMIN",
      branch: newBranch,
      brands: ["Xiaomi"],
      status: "ACTIVE",
    };

    setEmployees([newEmp, ...employees]);
    setIsAddOpen(false);
    setNewNik("");
    setNewName("");
    setNewEmail("");
  };

  const toggleUserStatus = (id: string) => {
    setEmployees((prev) =>
      prev.map((e) =>
        e.id === id
          ? { ...e, status: e.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" }
          : e,
      ),
    );
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

  return (
    <AppShell pageTitle="Manajemen User">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Manajemen Pengguna & Karyawan
            </h2>
            <p className="text-xs md:text-sm text-slate-500 mt-0.5">
              Kelola data akun, mapping role hierarkis (RBAC), penugasan cabang, dan otorisasi brand partner.
            </p>
          </div>

          <Button
            size="sm"
            variant="primary"
            onClick={() => setIsAddOpen(true)}
            leftIcon={<UserPlus className="w-4 h-4" />}
          >
            Tambah Karyawan
          </Button>
        </div>

        {/* Filters and Search Bar */}
        <div className="bg-white border border-slate-200 rounded-[8px] p-4 flex flex-col sm:flex-row gap-4 items-center justify-between shadow-sm">
          <div className="w-full sm:w-80">
            <Input
              placeholder="Cari berdasarkan NIK, Nama, Email..."
              leftIcon={<Search className="w-4 h-4" />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="w-full sm:w-auto flex items-center gap-3">
            <Select
              options={[
                { value: "ALL", label: "Semua Role" },
                { value: "SUPER_ADMIN", label: "Super Admin" },
                { value: "TRAINER", label: "Trainer" },
                { value: "SUPERVISOR", label: "Supervisor" },
                { value: "STAFF", label: "Staff (Trainee)" },
              ]}
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-44"
            />

            <Select
              options={[
                { value: "ALL", label: "Semua Cabang" },
                { value: "Jakarta Pusat", label: "Jakarta Pusat" },
                { value: "Surabaya", label: "Surabaya" },
                { value: "Bandung", label: "Bandung" },
                { value: "Medan", label: "Medan" },
                { value: "Makassar", label: "Makassar" },
              ]}
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="w-44"
            />
          </div>
        </div>

        {/* Employees Table */}
        <div className="bg-white border border-slate-200 rounded-[8px] p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              Daftar Karyawan Terdaftar ({filteredEmployees.length})
            </h3>
            <Badge variant="neutral" size="sm">Multi-Branch Authorized</Badge>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>NIK</TableHead>
                <TableHead>Nama Karyawan</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Cabang</TableHead>
                <TableHead>Brand Terkait</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmployees.map((emp) => (
                <TableRow key={emp.id}>
                  <TableCell className="font-mono text-xs font-bold text-slate-800">
                    {emp.nik}
                  </TableCell>
                  <TableCell className="font-semibold text-slate-900">
                    {emp.name}
                  </TableCell>
                  <TableCell className="text-xs text-slate-600">
                    {emp.email}
                  </TableCell>
                  <TableCell>
                    {emp.role === "SUPER_ADMIN" && <Badge variant="default" size="sm">Super Admin</Badge>}
                    {emp.role === "TRAINER" && <Badge variant="warning" size="sm">Trainer</Badge>}
                    {emp.role === "SUPERVISOR" && <Badge variant="default" size="sm">Supervisor</Badge>}
                    {emp.role === "STAFF" && <Badge variant="neutral" size="sm">Staff</Badge>}
                  </TableCell>
                  <TableCell className="text-xs text-slate-600">
                    {emp.branch}
                  </TableCell>
                  <TableCell className="text-xs text-slate-600">
                    <div className="flex flex-wrap gap-1">
                      {emp.brands.slice(0, 2).map((b, idx) => (
                        <span key={idx} className="bg-slate-100 px-1.5 py-0.5 rounded text-[10px] text-slate-700">
                          {b}
                        </span>
                      ))}
                      {emp.brands.length > 2 && (
                        <span className="text-[10px] text-slate-400 font-semibold">
                          +{emp.brands.length - 2}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant={emp.status === "ACTIVE" ? "success" : "danger"} size="sm">
                      {emp.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => toggleUserStatus(emp.id)}
                        className="text-xs text-slate-500 hover:text-slate-800 p-1 rounded hover:bg-slate-100"
                        title={emp.status === "ACTIVE" ? "Nonaktifkan Akun" : "Aktifkan Akun"}
                      >
                        {emp.status === "ACTIVE" ? (
                          <UserX className="w-3.5 h-3.5 text-red-500" />
                        ) : (
                          <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                        )}
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Modal: Tambah Karyawan Baru */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Tambah Karyawan Baru"
        description="Daftarkan akun karyawan baru ke dalam sistem Unicom University."
        maxWidth="md"
      >
        <div className="space-y-4">
          <Input
            label="Nomor Induk Karyawan (NIK)"
            placeholder="Contoh: UC10099"
            value={newNik}
            onChange={(e) => setNewNik(e.target.value)}
          />

          <Input
            label="Nama Lengkap"
            placeholder="Contoh: Fajar Nugraha"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />

          <Input
            label="Email Resmi Unicom"
            type="email"
            placeholder="Contoh: fajar.nugraha@unicom.co.id"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
          />

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Peran (Role)"
              options={[
                { value: "STAFF", label: "Staff (Trainee)" },
                { value: "TRAINER", label: "Trainer" },
                { value: "SUPERVISOR", label: "Supervisor" },
                { value: "SUPER_ADMIN", label: "Super Admin" },
              ]}
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
            />

            <Select
              label="Cabang (Branch)"
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

          <div className="pt-2 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>
              Batal
            </Button>
            <Button variant="primary" onClick={handleAddEmployee}>
              Simpan & Daftarkan Karyawan
            </Button>
          </div>
        </div>
      </Modal>
    </AppShell>
  );
}
