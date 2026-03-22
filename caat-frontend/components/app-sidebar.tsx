"use client"

import * as React from "react"

import logo from "@/components/assets/logo.webp"
import Image from "next/image"
import {
  User,
  School,
  FileUser,
  LayoutDashboard,
  FileText,
  BookOpen,
  GraduationCap,
  FolderOpen,
} from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroupLabel
} from "@/components/ui/sidebar"
import { NavUser } from "./nav-user"

// This is sample data.
const data = {
  user: {
    name: "name-placeholder",
    email: "name@email.com",
    avatar: "/avatars/shadcn.jpg",
  },
  apps: [
    { title: "Dashboard", icon: LayoutDashboard, url: "/dashboard", },
    { title: "My Profile", icon: User, url: "/profile", },
    { title: "Schools", icon: School, url: "/schools", },
    { title: "Majors", icon: BookOpen, url: "/majors", },
    { title: "Resume Builder", icon: FileUser, url: "/resume-builder", },
    { title: "Essays", icon: FileText, url: "/essays", },
    { title: "Scholarships", icon: GraduationCap, url: "/scholarships", },
    { title: "Documents", icon: FolderOpen, url: "/documents", },
  ]
}
export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar {...props}>
      <SidebarHeader className="py-5 px-6 border-b border-sidebar-border">
        
        <div className="relative h-11 w-36 items-center justify-center">
          <Image 
            src={logo} 
            alt="myCAAT Logo" 
            fill 
            className="object-contain object-left"
            priority
          />
        </div>
      
      </SidebarHeader>

      <SidebarContent className="">
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/50 uppercase text-[10px] tracking-widest font-semibold px-4 mb-1">
            Tools
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {data.apps.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild className="gap-3 px-4 py-2.5 text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent">
                    <a href={item.url}>
                      <item.icon className="size-4 shrink-0"/>
                      <span className="text-sm font-medium">{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        <NavUser user={data.user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
