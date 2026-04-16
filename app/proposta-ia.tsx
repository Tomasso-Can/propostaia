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
    if (!descricao.trim() || !nomeCliente.trim()) {
      alert('Por favor, preenche o nome do cliente e a descrição do projeto.');
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
    let y = 55;

    // Capa profissional
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 297, 'F');

    doc.setTextColor(255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(42);
    doc.text("PROPOSTA", pageWidth / 2, y, { align: "center" });

    y += 25;
    doc.setFontSize(28);
    doc.text("COMERCIAL", pageWidth / 2, y, { align: "center" });

    y += 80;
    doc.setFontSize(16);
    doc.setTextColor(180, 200, 255);
    doc.text("Para", pageWidth / 2, y, { align: "center" });

    y += 18;
    doc.setFontSize(23);
    doc.setTextColor(255);
    doc.text(nomeClientePDF, pageWidth / 2, y, { align: "center" });

    y += 65;
    doc.setFontSize(11);
    doc.setTextColor(180, 200, 230);
    doc.text(`Preparada por: ${user.email}`, pageWidth / 2, y, { align: "center" });

    y += 12;
    doc.text(new Date().toLocaleDateString('pt-PT', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }), pageWidth / 2, y, { align: "center" });

    // Conteúdo
    doc.addPage();
    y = 40;

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(20);
    doc.text("Proposta Comercial", pageWidth / 2, y, { align: "center" });

    y += 20;
    doc.line(40, y, pageWidth - 40, y);

    y += 30;

    doc.setTextColor(40);
    doc.setFontSize(12.5);
    const lines = doc.splitTextToSize(propostaTexto, pageWidth - 55);

    lines.forEach((line: string) => {
      if (y > 270) {
        doc.addPage();
        y = 40;
      }
      doc.text(line, 32, y);
      y += 8;
    });

    // Rodapé
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(9);
      doc.setTextColor(120);
      doc.text("Gerado por PropostaIA", pageWidth / 2, 287, { align: "center" });
    }

    const nomeFicheiro = `Proposta_${nomeClientePDF.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
    doc.save(nomeFicheiro);
  };

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="text-center mb-16">
          <div className="flex justify-center mb-6">
            <div className="bg-emerald-600 text-white px-5 py-1.5 rounded-full text-sm font-medium flex items-center gap-2">
              <FileText className="w-4 h-4" />
              PROPOSTAIA
            </div>
          </div>
          <h1 className="text-5xl font-bold text-white mb-4">Propostas que vendem</h1>
          <p className="text-zinc-400 text-xl">Crie propostas profissionais em segundos</p>
        </div>

        <div className="flex border-b border-zinc-800 mb-10">
          <button
            onClick={() => setAbaAtiva('nova')}
            className={`px-8 py-4 text-lg font-medium ${abaAtiva === 'nova' ? 'border-b-2 border-emerald-500 text-emerald-400' : 'text-zinc-400'}`}
          >
            Nova Proposta
          </button>
          <button
            onClick={() => {
              setAbaAtiva('historico');
              carregarHistorico();
            }}
            className={`px-8 py-4 text-lg font-medium flex items-center gap-2 ${abaAtiva === 'historico' ? 'border-b-2 border-emerald-500 text-emerald-400' : 'text-zinc-400'}`}
          >
            <Clock className="w-5 h-5" />
            Histórico
          </button>
        </div>

        {abaAtiva === 'nova' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div className="bg-zinc-900 rounded-3xl p-10">
              <h2 className="text-3xl font-semibold mb-8 text-white">Nova Proposta</h2>
              <div className="space-y-6">
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Nome do Cliente</label>
                  <input
                    type="text"
                    value={nomeCliente}
                    onChange={(e) => setNomeCliente(e.target.value)}
                    placeholder="Ex: Eng.ª Ana Costa"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-6 py-4 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Descrição do Projeto</label>
                  <textarea
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    placeholder="Descreva o projeto com detalhe..."
                    className="w-full h-80 bg-zinc-800 border border-zinc-700 rounded-3xl px-6 py-6 text-white"
                  />
                </div>
                <button
                  onClick={gerarProposta}
                  disabled={loading || !descricao || !nomeCliente}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 py-5 rounded-2xl text-lg font-semibold disabled:opacity-50"
                >
                  {loading ? 'A gerar proposta...' : 'Gerar Proposta Profissional'}
                </button>
              </div>
            </div>

            <div className="bg-zinc-900 rounded-3xl p-10">
              <div className="flex justify-between mb-8">
                <h2 className="text-3xl font-semibold">Pré-visualização</h2>
                {proposta && (
                  <button onClick={() => downloadPDF(proposta, nomeCliente)} className="text-emerald-400 hover:text-emerald-500 flex items-center gap-2">
                    <Download className="w-5 h-5" /> PDF
                  </button>
                )}
              </div>
              <div className="bg-zinc-950 border border-zinc-800 rounded-3xl p-10 min-h-[500px] text-zinc-300 whitespace-pre-wrap">
                {proposta || "A proposta aparecerá aqui após geração..."}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
