'use client';

import { useState, useEffect } from 'react';
import { Download, Loader2, Clock, CheckCircle, FileText } from 'lucide-react';
import jsPDF from 'jspdf';
import { User } from '@supabase/supabase-js';
import { createBrowserClient } from '@supabase/ssr';

interface Proposta {
  id: string;
  nome_cliente: string;
  descricao: string;
  proposta_texto: string;
  created_at: string;
}

interface PropostaIAProps {
  user: User;
}

export default function PropostaIA({ user }: PropostaIAProps) {
  const [descricao, setDescricao] = useState('');
  const [nomeCliente, setNomeCliente] = useState('');
  const [nomeUtilizador, setNomeUtilizador] = useState('');
  const [contacto, setContacto] = useState('');
  const [morada, setMorada] = useState('');
  const [proposta, setProposta] = useState('');
  const [loading, setLoading] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState('');
  const [propostasSalvas, setPropostasSalvas] = useState<Proposta[]>([]);
  const [abaAtiva, setAbaAtiva] = useState<'nova' | 'historico'>('nova');

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const carregarHistorico = async () => {
    const { data } = await supabase
      .from('propostas')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setPropostasSalvas(data || []);
  };

  useEffect(() => {
    carregarHistorico();
  }, [user.id]);

  const gerarProposta = async () => {
    if (!descricao.trim() || !nomeCliente.trim() || !nomeUtilizador.trim()) {
      alert('Por favor, preenche o teu nome, o nome do cliente e a descrição do projeto.');
      return;
    }

    setLoading(true);
    setProposta('');
    setMensagemSucesso('');

    try {
      const res = await fetch('/api/gerar-proposta', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ descricao }),
      });

      const data = await res.json();

      if (data.proposta) {
        setProposta(data.proposta);

        const { error } = await supabase.from('propostas').insert({
          user_id: user.id,
          nome_cliente: nomeCliente,
          descricao: descricao,
          proposta_texto: data.proposta,
        });

        if (!error) {
          setMensagemSucesso('✅ Proposta gerada e guardada com sucesso!');
          await carregarHistorico();
          setTimeout(() => setMensagemSucesso(''), 4000);
        }
      } else {
        alert(data.error || 'Erro ao gerar a proposta.');
      }
    } catch (error) {
      console.error(error);
      alert('Erro ao gerar a proposta. Tenta novamente.');
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = (propostaTexto: string, nomeClientePDF: string) => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 52;

    // === CAPA ===
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 297, 'F');

    doc.setTextColor(255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(44);
    doc.text("PROPOSTA", pageWidth / 2, y, { align: "center" });

    y += 26;
    doc.setFontSize(29);
    doc.text("COMERCIAL", pageWidth / 2, y, { align: "center" });

    y += 72;
    doc.setFontSize(16);
    doc.setTextColor(180, 200, 255);
    doc.text("Para", pageWidth / 2, y, { align: "center" });

    y += 19;
    doc.setFontSize(24);
    doc.setTextColor(255);
    doc.text(nomeClientePDF.toUpperCase(), pageWidth / 2, y, { align: "center" });

    y += 68;
    doc.setFontSize(11.5);
    doc.setTextColor(180, 200, 230);
    doc.text(`Preparada por: ${nomeUtilizador || user.email}`, pageWidth / 2, y, { align: "center" });

    y += 13;
    doc.text(new Date().toLocaleDateString('pt-PT', { year: 'numeric', month: 'long', day: 'numeric' }), pageWidth / 2, y, { align: "center" });

    // === PÁGINA DE CONTEÚDO ===
    doc.addPage();
    y = 40;

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(21);
    doc.text("Proposta Comercial", pageWidth / 2, y, { align: "center" });

    y += 16;
    doc.setLineWidth(1.1);
    doc.line(38, y, pageWidth - 38, y);

    y += 32;

    doc.setTextColor(40);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12.8);

    const lines = doc.splitTextToSize(propostaTexto, pageWidth - 52);

    lines.forEach((line: string, index: number) => {
      // Margem de segurança mais inteligente para evitar títulos órfãos
      if (y > 255) {
        doc.addPage();
        y = 40;
      }

      // Se for um título numerado (ex: "1. ", "2. ", etc.), dá um pouco mais de espaço em baixo
      if (/^\d+\.\s/.test(line)) {
        if (y > 240) {  // Mais margem para títulos
          doc.addPage();
          y = 40;
        }
      }

      doc.text(line, 30, y);
      y += 8.2;
    });

    // === FINAL LIMPO ===
    if (y > 240) {
      doc.addPage();
      y = 40;
    }

    y += 28;
    doc.setFontSize(13.5);
    doc.text("Atenciosamente,", 30, y);

    y += 13;
    doc.setFont("helvetica", "bold");
    doc.text(nomeUtilizador || user.email || "Equipa PropostaIA", 30, y);

    if (contacto) {
      y += 11;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11.5);
      doc.text(contacto, 30, y);
    }
    if (morada) {
      y += 9;
      doc.text(morada, 30, y);
    }

    // Rodapé em todas as páginas
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(9.5);
      doc.setTextColor(130);
      doc.text("Gerado por PropostaIA • propostaia.pt", pageWidth / 2, 287, { align: "center" });
    }

    const nomeFicheiro = `Proposta_${nomeClientePDF.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
    doc.save(nomeFicheiro);
  };

  return (
    // ... (o resto do return permanece igual ao anterior - não precisa mudar)
    // Para não repetir todo o código, mantém o return da versão anterior
    // Só precisas de substituir a função downloadPDF dentro do ficheiro
  );
}
