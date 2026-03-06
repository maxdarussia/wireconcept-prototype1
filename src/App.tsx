import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { FinanceProvider } from "@/contexts/FinanceContext";
import { Layout } from "@/components/Layout";
import Dashboard from "./pages/Dashboard";
import Receitas from "./pages/Receitas";
import ContasPagar from "./pages/ContasPagar";
import Cartoes from "./pages/Cartoes";
import CartaoFaturas from "./pages/CartaoFaturas";
import Relatorios from "./pages/Relatorios";
import Busca from "./pages/Busca";
import Alertas from "./pages/Alertas";
import PlanoContas from "./pages/PlanoContas";
import RelatorioDRE from "./pages/RelatorioDRE";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <FinanceProvider>
        <BrowserRouter>
          <Layout>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/receitas" element={<Receitas />} />
              <Route path="/contas" element={<ContasPagar />} />
              <Route path="/cartoes" element={<Cartoes />} />
              <Route path="/cartoes/:cartaoId" element={<CartaoFaturas />} />
              <Route path="/relatorios" element={<Relatorios />} />
              <Route path="/busca" element={<Busca />} />
              <Route path="/alertas" element={<Alertas />} />
              <Route path="/plano-contas" element={<PlanoContas />} />
              <Route path="/dre" element={<RelatorioDRE />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Layout>
        </BrowserRouter>
      </FinanceProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
