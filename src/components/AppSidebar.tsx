import { LayoutDashboard, DollarSign, Receipt, CreditCard, BarChart3, Bell, Search, BookOpen, FileText } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useLocation } from 'react-router-dom';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar } from
'@/components/ui/sidebar';

const items = [
{ title: 'Dashboard', url: '/', icon: LayoutDashboard },
{ title: 'Receitas', url: '/receitas', icon: DollarSign },
{ title: 'Contas a Pagar', url: '/contas', icon: Receipt },
{ title: 'Cartões de Crédito', url: '/cartoes', icon: CreditCard },
{ title: 'Relatórios', url: '/relatorios', icon: BarChart3 },
{ title: 'Plano de Contas', url: '/plano-contas', icon: BookOpen },
{ title: 'Relatório DRE', url: '/dre', icon: FileText },
{ title: 'Busca de Gastos', url: '/busca', icon: Search },
{ title: 'Alertas de Gastos', url: '/alertas', icon: Bell }];


export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="p-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-sidebar-primary flex items-center justify-center shrink-0">
            <DollarSign className="w-5 h-5 text-sidebar-primary-foreground" />
          </div>
          {!collapsed && <span className="font-bold text-lg text-sidebar-primary-foreground" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>​WireConcept Prototype1 </span>}
        </div>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) =>
              <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                    to={item.url}
                    end={item.url === '/'}
                    className="hover:bg-sidebar-accent"
                    activeClassName="bg-sidebar-accent text-sidebar-primary font-medium">
                    
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>);

}