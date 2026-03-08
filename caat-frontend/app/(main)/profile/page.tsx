"use client";

import React, { useState } from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import {
  Camera,
  Pencil,
  MapPin,
  Code2,
  Users,
  Trophy,
  FileText,
  Eye,
  GraduationCap,
  Award,
  Target,
  Star,
  X,
  Check,
  Download,
  User,
} from "lucide-react";

// ── Mock data ──────────────────────────────────────────────────────────────────

const MOCK = {
  firstName: "Alex",
  lastName: "Johnson",
  email: "alex.johnson@email.com",
  phone: "+1 (416) 555-0123",
  birthDate: "May 14, 2007",
  nationality: "South Korean",
  currentLocation: "Toronto, Canada",
  visaStatus: "F-1 Processed",
  schoolName: "International Academy of Toronto",
  curriculum: "IB Diploma (IBDP)",
  currentGPA: "3.9 / 4.0",
  graduationYear: "2025",
  classRank: "Top 5%",
  satScore: "1540",
  ieltsScore: "8.5",
  targetMajors: ["Computer Science", "Data Science", "AI & Ethics"],
  preferredCountries: ["USA", "Canada", "UK"],
  completionPercent: 65,
};

const ACTIVITIES = [
  {
    Icon: Code2,
    name: "App Development Club",
    role: "Founder & President",
    description:
      "Led a team of 15 students to build a community service tracking app used by 500+ peers.",
  },
  {
    Icon: Users,
    name: "Local Senior Center",
    role: "Volunteer Tech Tutor",
    description:
      "Spent 150+ hours teaching digital literacy to local seniors twice a week.",
  },
  {
    Icon: Trophy,
    name: "Varsity Soccer",
    role: "Team Captain",
    description:
      'Led the varsity team to regional championships. Awarded "Player of the Season" in 2023.',
  },
];

// ── Small reusable pieces ─────────────────────────────────────────────────────

function InfoRow({
  label,
  value,
  badge,
}: {
  label: string;
  value: string;
  badge?: "green" | "blue";
}) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0">
      <span className="text-sm text-slate-500 shrink-0">{label}</span>
      {badge === "green" ? (
        <span className="text-xs font-medium bg-green-100 text-green-700 px-2.5 py-0.5 rounded-full">
          {value}
        </span>
      ) : badge === "blue" ? (
        <span className="text-xs font-medium bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full">
          {value}
        </span>
      ) : (
        <span className="text-sm font-medium text-slate-800 text-right">{value}</span>
      )}
    </div>
  );
}

function EditRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1 py-1.5">
      <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
        {label}
      </label>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 text-sm"
      />
    </div>
  );
}

function CardActions({
  isEditing,
  onEdit,
  onSave,
  onCancel,
}: {
  isEditing: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
}) {
  if (isEditing) {
    return (
      <div className="flex items-center gap-1.5">
        <button
          onClick={onSave}
          className="flex items-center gap-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 px-2.5 py-1.5 rounded-md transition-colors"
        >
          <Check className="h-3 w-3" />
          Save
        </button>
        <button
          onClick={onCancel}
          className="flex items-center text-xs text-slate-500 hover:text-slate-800 px-2 py-1.5 rounded-md transition-colors"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }
  return (
    <button
      onClick={onEdit}
      className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-800 px-2 py-1.5 rounded-md hover:bg-blue-50 transition-colors"
    >
      <Pencil className="h-3 w-3" />
      Edit
    </button>
  );
}

function SectionCard({
  icon,
  title,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  children,
  className,
}: {
  icon: React.ReactNode;
  title: string;
  isEditing: boolean;
  onEdit: () => void;
  onSave: () => void;
  onCancel: () => void;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={`gap-0 py-0 overflow-hidden ${className ?? ""}`}>
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="text-blue-600">{icon}</div>
          <span className="text-sm font-semibold text-slate-800">{title}</span>
        </div>
        <CardActions
          isEditing={isEditing}
          onEdit={onEdit}
          onSave={onSave}
          onCancel={onCancel}
        />
      </div>
      <div className="px-5 py-2">{children}</div>
    </Card>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const [activeEdit, setActiveEdit] = useState<string | null>(null);

  // Personal info
  const [personal, setPersonal] = useState({
    firstName: MOCK.firstName,
    lastName: MOCK.lastName,
    birthDate: MOCK.birthDate,
    nationality: MOCK.nationality,
    currentLocation: MOCK.currentLocation,
    visaStatus: MOCK.visaStatus,
  });
  const [personalDraft, setPersonalDraft] = useState(personal);

  // Academic
  const [academic, setAcademic] = useState({
    schoolName: MOCK.schoolName,
    curriculum: MOCK.curriculum,
    currentGPA: MOCK.currentGPA,
    graduationYear: MOCK.graduationYear,
    classRank: MOCK.classRank,
  });
  const [academicDraft, setAcademicDraft] = useState(academic);

  // Testing
  const [testing, setTesting] = useState({
    satScore: MOCK.satScore,
    ieltsScore: MOCK.ieltsScore,
  });
  const [testingDraft, setTestingDraft] = useState(testing);

  // Interests
  const [interests] = useState({
    targetMajors: MOCK.targetMajors,
    preferredCountries: MOCK.preferredCountries,
  });

  function startEdit(section: string, resetDraft: () => void) {
    resetDraft();
    setActiveEdit(section);
  }

  function commitEdit(section: string, save: () => void) {
    save();
    setActiveEdit(null);
  }

  function cancelEdit(section: string, reset: () => void) {
    reset();
    setActiveEdit(null);
  }

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-2 px-4 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mr-2 data-[orientation=vertical]:h-4"
        />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem className="hidden md:block">
              <BreadcrumbLink>My Profile</BreadcrumbLink>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </header>

      <div className="flex flex-1 flex-col gap-5 px-4 pb-8 md:px-6 bg-slate-50 min-h-0">

        {/* ── Profile hero ────────────────────────────────────────────────────── */}
        <Card className="gap-0 py-0 overflow-hidden">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-5 px-6 py-5">
            {/* Avatar with camera overlay */}
            <div className="relative group shrink-0 cursor-pointer">
              <Avatar className="size-24 ring-4 ring-blue-100 ring-offset-2">
                <AvatarFallback className="bg-gradient-to-br from-blue-400 to-blue-600 text-white text-2xl font-bold">
                  {personal.firstName[0]}{personal.lastName[0]}
                </AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="h-5 w-5 text-white" />
              </div>
              {/* Edit badge */}
              <div className="absolute -bottom-0.5 -right-0.5 bg-blue-600 rounded-full p-1 shadow">
                <Pencil className="h-2.5 w-2.5 text-white" />
              </div>
            </div>

            {/* Name + subtitle */}
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                {personal.firstName} {personal.lastName}
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Class of {academic.graduationYear} | International Applicant
              </p>
              <div className="flex items-center gap-1 mt-1.5 text-sm text-slate-400">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span>{personal.currentLocation}</span>
              </div>
            </div>

            {/* Progress */}
            <div className="w-full md:w-72 shrink-0 bg-slate-50 rounded-xl border border-slate-200 px-4 py-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">
                  Application Progress
                </span>
                <span className="text-xs font-bold text-blue-600">
                  {MOCK.completionPercent}% Complete
                </span>
              </div>
              <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full"
                  style={{ width: `${MOCK.completionPercent}%` }}
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5">
                Tip: Add your standardized test scores to reach 80%!
              </p>
            </div>
          </div>
        </Card>

        {/* ── 2-column grid ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

          {/* Personal Information */}
          <SectionCard
            icon={<User className="h-4 w-4" />}
            title="Personal Information"
            isEditing={activeEdit === "personal"}
            onEdit={() =>
              startEdit("personal", () => setPersonalDraft({ ...personal }))
            }
            onSave={() =>
              commitEdit("personal", () => setPersonal({ ...personalDraft }))
            }
            onCancel={() =>
              cancelEdit("personal", () => setPersonalDraft({ ...personal }))
            }
          >
            {activeEdit === "personal" ? (
              <div className="grid grid-cols-2 gap-x-3 py-1">
                <EditRow
                  label="First Name"
                  value={personalDraft.firstName}
                  onChange={(v) =>
                    setPersonalDraft((d) => ({ ...d, firstName: v }))
                  }
                />
                <EditRow
                  label="Last Name"
                  value={personalDraft.lastName}
                  onChange={(v) =>
                    setPersonalDraft((d) => ({ ...d, lastName: v }))
                  }
                />
                <div className="col-span-2">
                  <EditRow
                    label="Date of Birth"
                    value={personalDraft.birthDate}
                    onChange={(v) =>
                      setPersonalDraft((d) => ({ ...d, birthDate: v }))
                    }
                  />
                </div>
                <div className="col-span-2">
                  <EditRow
                    label="Nationality"
                    value={personalDraft.nationality}
                    onChange={(v) =>
                      setPersonalDraft((d) => ({ ...d, nationality: v }))
                    }
                  />
                </div>
                <div className="col-span-2">
                  <EditRow
                    label="Current Location"
                    value={personalDraft.currentLocation}
                    onChange={(v) =>
                      setPersonalDraft((d) => ({ ...d, currentLocation: v }))
                    }
                  />
                </div>
                <div className="col-span-2">
                  <EditRow
                    label="Visa Status"
                    value={personalDraft.visaStatus}
                    onChange={(v) =>
                      setPersonalDraft((d) => ({ ...d, visaStatus: v }))
                    }
                  />
                </div>
              </div>
            ) : (
              <div className="py-1">
                <InfoRow
                  label="Full Name"
                  value={`${personal.firstName} ${personal.lastName}`}
                />
                <InfoRow label="Date of Birth" value={personal.birthDate} />
                <InfoRow label="Nationality" value={personal.nationality} />
                <InfoRow
                  label="Current Location"
                  value={personal.currentLocation}
                />
                <InfoRow
                  label="Visa Status"
                  value={personal.visaStatus}
                  badge="green"
                />
              </div>
            )}
          </SectionCard>

          {/* Academic Profile */}
          <SectionCard
            icon={<GraduationCap className="h-4 w-4" />}
            title="Academic Profile"
            isEditing={activeEdit === "academic"}
            onEdit={() =>
              startEdit("academic", () => setAcademicDraft({ ...academic }))
            }
            onSave={() =>
              commitEdit("academic", () => setAcademic({ ...academicDraft }))
            }
            onCancel={() =>
              cancelEdit("academic", () => setAcademicDraft({ ...academic }))
            }
          >
            {activeEdit === "academic" ? (
              <div className="flex flex-col py-1">
                <EditRow
                  label="School Name"
                  value={academicDraft.schoolName}
                  onChange={(v) =>
                    setAcademicDraft((d) => ({ ...d, schoolName: v }))
                  }
                />
                <EditRow
                  label="Curriculum"
                  value={academicDraft.curriculum}
                  onChange={(v) =>
                    setAcademicDraft((d) => ({ ...d, curriculum: v }))
                  }
                />
                <EditRow
                  label="Current GPA"
                  value={academicDraft.currentGPA}
                  onChange={(v) =>
                    setAcademicDraft((d) => ({ ...d, currentGPA: v }))
                  }
                />
                <EditRow
                  label="Graduation Year"
                  value={academicDraft.graduationYear}
                  onChange={(v) =>
                    setAcademicDraft((d) => ({ ...d, graduationYear: v }))
                  }
                />
                <EditRow
                  label="Class Rank"
                  value={academicDraft.classRank}
                  onChange={(v) =>
                    setAcademicDraft((d) => ({ ...d, classRank: v }))
                  }
                />
              </div>
            ) : (
              <div className="py-1">
                <InfoRow label="School Name" value={academic.schoolName} />
                <InfoRow label="Curriculum" value={academic.curriculum} />
                <InfoRow label="Current GPA" value={academic.currentGPA} />
                <InfoRow
                  label="Graduation Year"
                  value={academic.graduationYear}
                />
                <InfoRow label="Class Rank" value={academic.classRank} />
              </div>
            )}
          </SectionCard>

          {/* Standardized Testing */}
          <SectionCard
            icon={<Award className="h-4 w-4" />}
            title="Standardized Testing"
            isEditing={activeEdit === "testing"}
            onEdit={() =>
              startEdit("testing", () => setTestingDraft({ ...testing }))
            }
            onSave={() =>
              commitEdit("testing", () => setTesting({ ...testingDraft }))
            }
            onCancel={() =>
              cancelEdit("testing", () => setTestingDraft({ ...testing }))
            }
          >
            {activeEdit === "testing" ? (
              <div className="grid grid-cols-2 gap-x-3 py-1">
                <EditRow
                  label="SAT Score (/ 1600)"
                  value={testingDraft.satScore}
                  onChange={(v) =>
                    setTestingDraft((d) => ({ ...d, satScore: v }))
                  }
                />
                <EditRow
                  label="IELTS Overall (/ 9.0)"
                  value={testingDraft.ieltsScore}
                  onChange={(v) =>
                    setTestingDraft((d) => ({ ...d, ieltsScore: v }))
                  }
                />
              </div>
            ) : (
              <div className="flex flex-col gap-4 py-2">
                {/* Score display */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-slate-400 mb-0.5">
                      SAT Score
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-blue-600 tabular-nums">
                        {testing.satScore}
                      </span>
                      <span className="text-sm text-slate-400">/ 1600</span>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-slate-400 mb-0.5">
                      IELTS Overall
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-blue-600 tabular-nums">
                        {testing.ieltsScore}
                      </span>
                      <span className="text-sm text-slate-400">/ 9.0</span>
                    </div>
                  </div>
                </div>

                {/* File attachment */}
                <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 group">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-slate-400 shrink-0" />
                    <span className="text-sm text-slate-600">
                      official_report_sat.pdf
                    </span>
                  </div>
                  <button className="text-slate-400 hover:text-slate-700 transition-colors p-0.5">
                    <Eye className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </SectionCard>

          {/* Interests & Goals */}
          <SectionCard
            icon={<Target className="h-4 w-4" />}
            title="Interests & Goals"
            isEditing={activeEdit === "interests"}
            onEdit={() => startEdit("interests", () => {})}
            onSave={() => commitEdit("interests", () => {})}
            onCancel={() => cancelEdit("interests", () => {})}
          >
            <div className="flex flex-col gap-4 py-2">
              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                  Target Majors
                </div>
                <div className="flex flex-wrap gap-2">
                  {interests.targetMajors.map((m) => (
                    <span
                      key={m}
                      className="inline-flex items-center gap-1 text-xs font-medium bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full"
                    >
                      {activeEdit === "interests" && (
                        <button className="hover:text-red-500 transition-colors">
                          <X className="h-2.5 w-2.5" />
                        </button>
                      )}
                      {m}
                    </span>
                  ))}
                  {activeEdit === "interests" && (
                    <button className="text-xs text-blue-600 border border-dashed border-blue-300 px-2.5 py-1 rounded-full hover:bg-blue-50 transition-colors">
                      + Add
                    </button>
                  )}
                </div>
              </div>

              <div>
                <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                  Preferred Countries
                </div>
                <div className="flex flex-wrap gap-2">
                  {interests.preferredCountries.map((c) => (
                    <span
                      key={c}
                      className="inline-flex items-center gap-1 text-xs font-medium bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full"
                    >
                      {activeEdit === "interests" && (
                        <button className="hover:text-red-500 transition-colors">
                          <X className="h-2.5 w-2.5" />
                        </button>
                      )}
                      {c}
                    </span>
                  ))}
                  {activeEdit === "interests" && (
                    <button className="text-xs text-slate-500 border border-dashed border-slate-300 px-2.5 py-1 rounded-full hover:bg-slate-100 transition-colors">
                      + Add
                    </button>
                  )}
                </div>
              </div>
            </div>
          </SectionCard>
        </div>

        {/* ── Extracurriculars (full width) ────────────────────────────────────── */}
        <Card className="gap-0 py-0 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-blue-600" />
              <span className="text-sm font-semibold text-slate-800">
                Extracurriculars & Resume
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                <Download className="h-3.5 w-3.5" />
                Manage Resume
              </Button>
              <Button
                size="sm"
                className="h-8 text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Pencil className="h-3 w-3" />
                Edit Activities
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-100">
            {ACTIVITIES.map(({ Icon, name, role, description }) => (
              <div
                key={name}
                className="px-5 py-4 flex flex-col gap-2.5 hover:bg-slate-50/80 transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg shrink-0 mt-0.5">
                    <Icon className="h-3.5 w-3.5 text-blue-600" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-800 leading-tight">
                      {name}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">{role}</div>
                  </div>
                </div>
                <p className="text-xs text-slate-500 leading-relaxed pl-0.5">
                  {description}
                </p>
              </div>
            ))}
          </div>
        </Card>

        <p className="text-center text-xs text-slate-400 pb-2">
          © 2024 UniApply International. All rights reserved.
        </p>
      </div>
    </>
  );
}
