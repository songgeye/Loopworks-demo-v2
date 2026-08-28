"use client";

import { useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { Button, Field, Select, TextInput } from "@/components/form-controls";
import { PageHeader } from "@/components/page-header";
import { Badge, SectionCard } from "@/components/ui";
import {
  getBuyers,
  getCompanies,
  getMaterials,
  getStaffs,
  isCompanyInUse,
  isMaterialInUse,
  isStaffInUse,
} from "@/lib/api";
import type { Buyer, Company, Material, Staff, StaffRole } from "@/lib/types";

export default function MasterPage() {
  const [materials, setMaterials] = useState<Material[]>(() => getMaterials());
  const [staffs, setStaffs] = useState<Staff[]>(() => getStaffs());
  const [companies, setCompanies] = useState<Company[]>(() => getCompanies());
  const [buyers, setBuyers] = useState<Buyer[]>(() => getBuyers());

  const [materialName, setMaterialName] = useState("");
  const [staffName, setStaffName] = useState("");
  const [staffUsername, setStaffUsername] = useState("");
  const [staffRole, setStaffRole] = useState<StaffRole>("staff");
  const [companyName, setCompanyName] = useState("");
  const [buyerName, setBuyerName] = useState("");

  const nextMaterialId = useMemo(
    () => Math.max(0, ...materials.map((m) => m.id)) + 1,
    [materials],
  );
  const nextStaffId = useMemo(() => Math.max(0, ...staffs.map((s) => s.id)) + 1, [staffs]);
  const nextCompanyId = useMemo(
    () => Math.max(0, ...companies.map((c) => c.id)) + 1,
    [companies],
  );
  const nextBuyerId = useMemo(() => Math.max(0, ...buyers.map((b) => b.id)) + 1, [buyers]);

  const duplicateMaterial = materials.some((m) => m.name === materialName.trim());
  const duplicateCompany = companies.some((c) => c.name === companyName.trim());
  const duplicateBuyer = buyers.some((b) => b.name === buyerName.trim());

  const addMaterial = (event: React.FormEvent) => {
    event.preventDefault();
    const name = materialName.trim();
    if (!name || duplicateMaterial) return;
    setMaterials((prev) => [
      ...prev,
      {
        id: nextMaterialId,
        name,
        displayOrder: Math.max(0, ...prev.map((m) => m.displayOrder)) + 1,
        deletedAt: null,
      },
    ]);
    setMaterialName("");
  };

  const addStaff = (event: React.FormEvent) => {
    event.preventDefault();
    const name = staffName.trim();
    const username = staffUsername.trim();
    if (!name || !username) return;
    setStaffs((prev) => [
      ...prev,
      { id: nextStaffId, username, name, role: staffRole, deletedAt: null },
    ]);
    setStaffName("");
    setStaffUsername("");
    setStaffRole("staff");
  };

  const addCompany = (event: React.FormEvent) => {
    event.preventDefault();
    const name = companyName.trim();
    if (!name || duplicateCompany) return;
    setCompanies((prev) => [...prev, { id: nextCompanyId, name, deletedAt: null }]);
    setCompanyName("");
  };

  const addBuyer = (event: React.FormEvent) => {
    event.preventDefault();
    const name = buyerName.trim();
    if (!name || duplicateBuyer) return;
    setBuyers((prev) => [...prev, { id: nextBuyerId, name, deletedAt: null }]);
    setBuyerName("");
  };

  return (
    <>
      <PageHeader label="加工記録管理" title="マスタ" hideSearch />

      <SectionCard title="品目マスタ">
        <form onSubmit={addMaterial} className="flex flex-wrap items-end gap-3">
          <div className="min-w-50 flex-1">
            <Field
              label="品目名"
              hint={duplicateMaterial ? "同じ名前の品目がすでにあります" : undefined}
            >
              <TextInput
                value={materialName}
                onChange={(e) => setMaterialName(e.target.value)}
                placeholder="例：鉄スクラップ"
              />
            </Field>
          </div>
          <Button
            type="submit"
            disabled={materialName.trim() === "" || duplicateMaterial}
            className="sm:w-32"
          >
            追加する
          </Button>
        </form>
      </SectionCard>

      <section className="lw-card overflow-hidden">
        <ul className="xl:columns-2 xl:gap-x-6">
          {materials.map((material) => {
            const inUse = isMaterialInUse(material.id);
            return (
              <li
                key={material.id}
                className="flex items-center gap-4 border-b border-line-soft px-6 py-4 last:border-b-0 sm:px-7 xl:break-inside-avoid"
              >
                <span className="tnum w-8 shrink-0 font-mono text-sm text-fg-faint">
                  {material.displayOrder}
                </span>
                <span className="flex-1 truncate text-lg font-bold">{material.name}</span>
                {/* 生産記録から参照されている品目は削除できない */}
                {inUse ? <Badge tone="accent">使用中</Badge> : null}
                <button
                  type="button"
                  disabled={inUse}
                  onClick={() =>
                    setMaterials((prev) => prev.filter((m) => m.id !== material.id))
                  }
                  aria-label={`${material.name}を削除`}
                  title={inUse ? "生産記録で使用中のため削除できません" : "削除する"}
                  className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-line bg-card-2 text-fg-muted transition-colors hover:border-danger/50 hover:text-danger disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-line disabled:hover:text-fg-muted"
                >
                  <Trash2 size={18} aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <SectionCard title="作業者マスタ">
        <form onSubmit={addStaff} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto_auto]">
          <Field label="氏名">
            <TextInput
              value={staffName}
              onChange={(e) => setStaffName(e.target.value)}
              placeholder="例：山田 太郎"
            />
          </Field>
          <Field label="ログインID">
            <TextInput
              value={staffUsername}
              onChange={(e) => setStaffUsername(e.target.value)}
              placeholder="例：yamada"
            />
          </Field>
          <Field label="権限">
            <Select
              value={staffRole}
              onChange={(e) => setStaffRole(e.target.value as StaffRole)}
              className="sm:w-32"
            >
              <option value="staff">作業者</option>
              <option value="admin">管理者</option>
            </Select>
          </Field>
          <div className="flex items-end">
            <Button
              type="submit"
              disabled={staffName.trim() === "" || staffUsername.trim() === ""}
              className="w-full sm:w-32"
            >
              追加する
            </Button>
          </div>
        </form>
      </SectionCard>

      <section className="lw-card overflow-hidden">
        <ul className="xl:columns-2 xl:gap-x-6">
          {staffs.map((staff) => {
            const inUse = isStaffInUse(staff.id);
            return (
              <li
                key={staff.id}
                className="flex items-center gap-4 border-b border-line-soft px-6 py-4 last:border-b-0 sm:px-7 xl:break-inside-avoid"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-lg font-bold">{staff.name}</p>
                  <p className="truncate font-mono text-sm text-fg-muted">
                    {staff.username}
                  </p>
                </div>
                {staff.role === "admin" ? <Badge tone="accent">管理者</Badge> : null}
                {inUse ? <Badge>記録あり</Badge> : null}
                <button
                  type="button"
                  disabled={inUse}
                  onClick={() => setStaffs((prev) => prev.filter((s) => s.id !== staff.id))}
                  aria-label={`${staff.name}を削除`}
                  title={inUse ? "生産記録があるため削除できません" : "削除する"}
                  className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-line bg-card-2 text-fg-muted transition-colors hover:border-danger/50 hover:text-danger disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-line disabled:hover:text-fg-muted"
                >
                  <Trash2 size={18} aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <SectionCard title="仕入れ先マスタ">
        <form onSubmit={addCompany} className="flex flex-wrap items-end gap-3">
          <div className="min-w-50 flex-1">
            <Field
              label="会社名"
              hint={duplicateCompany ? "同じ名前の仕入れ先がすでにあります" : undefined}
            >
              <TextInput
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="例：丸和金属"
              />
            </Field>
          </div>
          <Button
            type="submit"
            disabled={companyName.trim() === "" || duplicateCompany}
            className="sm:w-32"
          >
            追加する
          </Button>
        </form>
      </SectionCard>

      <section className="lw-card overflow-hidden">
        <ul className="xl:columns-2 xl:gap-x-6">
          {companies.map((company) => {
            const inUse = isCompanyInUse(company.id);
            return (
              <li
                key={company.id}
                className="flex items-center gap-4 border-b border-line-soft px-6 py-4 last:border-b-0 sm:px-7 xl:break-inside-avoid"
              >
                <span className="flex-1 truncate text-lg font-bold">{company.name}</span>
                {/* 生産記録の持込元として参照されている仕入れ先は削除できない */}
                {inUse ? <Badge tone="accent">使用中</Badge> : null}
                <button
                  type="button"
                  disabled={inUse}
                  onClick={() =>
                    setCompanies((prev) => prev.filter((c) => c.id !== company.id))
                  }
                  aria-label={`${company.name}を削除`}
                  title={inUse ? "生産記録で使用中のため削除できません" : "削除する"}
                  className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-line bg-card-2 text-fg-muted transition-colors hover:border-danger/50 hover:text-danger disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:border-line disabled:hover:text-fg-muted"
                >
                  <Trash2 size={18} aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      <SectionCard title="売却先マスタ">
        <form onSubmit={addBuyer} className="flex flex-wrap items-end gap-3">
          <div className="min-w-50 flex-1">
            <Field
              label="会社名"
              hint={duplicateBuyer ? "同じ名前の売却先がすでにあります" : undefined}
            >
              <TextInput
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                placeholder="例：大東製鋼"
              />
            </Field>
          </div>
          <Button
            type="submit"
            disabled={buyerName.trim() === "" || duplicateBuyer}
            className="sm:w-32"
          >
            追加する
          </Button>
        </form>
      </SectionCard>

      <section className="lw-card overflow-hidden">
        <ul className="xl:columns-2 xl:gap-x-6">
          {buyers.map((buyer) => (
            <li
              key={buyer.id}
              className="flex items-center gap-4 border-b border-line-soft px-6 py-4 last:border-b-0 sm:px-7 xl:break-inside-avoid"
            >
              <span className="flex-1 truncate text-lg font-bold">{buyer.name}</span>
              <button
                type="button"
                onClick={() => setBuyers((prev) => prev.filter((b) => b.id !== buyer.id))}
                aria-label={`${buyer.name}を削除`}
                title="削除する"
                className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-line bg-card-2 text-fg-muted transition-colors hover:border-danger/50 hover:text-danger"
              >
                <Trash2 size={18} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      </section>

      <p className="px-2 text-sm text-fg-faint">
        ※ API 未接続のため、ここでの追加・削除はページを離れると元に戻ります。
      </p>
    </>
  );
}
