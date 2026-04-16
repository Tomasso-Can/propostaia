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

    // Capa
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageWidth, 297, 'F');

    doc.setTextColor(255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(42);
    doc.text("PROPOSTA", pageWidth / 2, y, { align: "center" });

    y += 25;
    doc.setFontSize(28);
    doc.text("COMERCIAL", pageWidth / 2, y, { align: "center" });

    y += 75;
    doc.setFontSize(16);
    doc.setTextColor(180, 200, 255);
    doc.text("Para", pageWidth / 2, y, { align: "center" });

    y += 18;
    doc.setFontSize(23);
    doc.setTextColor(255);
    doc.text(nomeClientePDF.toUpperCase(), pageWidth / 2, y, { align: "center" });

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

    // Página de conteúdo
    doc.addPage();
    y = 40;

    doc.setTextColor(15, 23, 42);
    doc.setFontSize(20);
    doc.text("Proposta Comercial", pageWidth / 2, y, { align: "center" });

    y += 15;
    doc.setLineWidth(1);
    doc.line(40, y, pageWidth - 40, y);

    y += 30;

    doc.setTextColor(40);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12.8);

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
      doc.text("Gerado por PropostaIA • propostaia.pt", pageWidth / 2, 287, { align: "center" });
    }

    const nomeFicheiro = `Proposta_${nomeClientePDF.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
    doc.save(nomeFicheiro);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="text-center mb-16">
          <div className="flex justify-center mb-6">
            <div className="bg-emerald-600 text-white px-5 py-1.5 rounded-full text-sm font-medium flex items-center gap-2">
              <FileText className="w-4 h-4" />
              PROPOSTAIA
            </div>
          </div>
          <h1 className="text-5xl font-bold tracking-tight mb-4">
            Propostas que vendem
          </h1>
          <p className="text-xl text-zinc-400 max-w-2xl mx-auto">
            Crie propostas profissionais, elegantes e persuasivas em segundos.
          </p>
        </div>

        <div className="flex border-b border-zinc-800 mb-10">
          <button
            onClick={() => setAbaAtiva('nova')}
            className={`px-10 py-4 text-lg font-medium transition ${abaAtiva === 'nova' ? 'border-b-2 border-emerald-500 text-emerald-400' : 'text-zinc-400 hover:text-white'}`}
          >
            Nova Proposta
          </button>
          <button
            onClick={() => {
              setAbaAtiva('historico');
              carregarHistorico();
            }}
            className={`px-10 py-4 text-lg font-medium flex items-center gap-3 transition ${abaAtiva === 'historico' ? 'border-b-2 border-emerald-500 text-emerald-400' : 'text-zinc-400 hover:text-white'}`}
          >
            <Clock className="w-5 h-5" />
            Histórico ({propostasSalvas.length})
          </button>
        </div>

        {abaAtiva === 'nova' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Formulário */}
            <div className="bg-zinc-900 rounded-3xl p-10">
              <h2 className="text-3xl font-semibold mb-8">Nova Proposta</h2>
              <div className="space-y-8">
                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Nome do Cliente</label>
                  <input
                    type="text"
                    value={nomeCliente}
                    onChange={(e) => setNomeCliente(e.target.value)}
                    placeholder="Ex: Eng.ª Ana Costa"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-2xl px-6 py-4 text-lg focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-sm text-zinc-400 mb-2">Descrição do Projeto</label>
                  <textarea
                    value={descricao}
                    onChange={(e) => setDescricao(e.target.value)}
                    placeholder="Descreva o projeto com o máximo de detalhe possível..."
                    className="w-full h-80 p-6 bg-zinc-800 border border-zinc-700 rounded-3xl text-lg resize-y focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <button
                  onClick={gerarProposta}
                  disabled={loading || !descricao.trim() || !nomeCliente.trim()}
                  className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-700 disabled:text-zinc-500 font-semibold py-5 rounded-2xl text-xl transition flex items-center justify-center gap-3"
                >
                  {loading ? (
                    <> <Loader2 className="w-6 h-6 animate-spin" /> A gerar proposta... </>
                  ) : (
                    'Gerar Proposta Profissional'
                  )}
                </button>
              </div>

              {mensagemSucesso && (
                <div className="mt-6 flex items-center gap-3 text-emerald-400 bg-emerald-950/50 border border-emerald-900 px-6 py-4 rounded-2xl">
                  <CheckCircle className="w-6 h-6" />
                  {mensagemSucesso}
                </div>
              )}
            </div>

            {/* Preview */}
            <div className="bg-zinc-900 rounded-3xl p-10 flex flex-col">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-3xl font-semibold">Pré-visualização</h3>
                {proposta && (
                  <button
                    onClick={() => downloadPDF(proposta, nomeCliente)}
                    className="flex items-center gap-3 bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-4 rounded-2xl font-semibold transition-all"
                  >
                    <Download className="w-5 h-5" />
                    Download PDF
                  </button>
                )}
              </div>

              {proposta ? (
                <div className="flex-1 bg-zinc-950 p-10 rounded-3xl border border-zinc-800 overflow-auto text-zinc-200 leading-relaxed whitespace-pre-wrap">
                  {proposta}
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-zinc-500 border border-dashed border-zinc-800 rounded-3xl">
                  A proposta aparecerá aqui após ser gerada
                </div>
              )}
            </div>
          </div>
        )}

        {abaAtiva === 'historico' && (
          <div className="bg-zinc-900 rounded-3xl p-10">
            <h3 className="text-3xl font-semibold mb-8">Histórico de Propostas</h3>
            {propostasSalvas.length === 0 ? (
              <p className="text-zinc-500 text-center py-12">Ainda não tens propostas guardadas.</p>
            ) : (
              <div className="space-y-6">
                {propostasSalvas.map((p) => (
                  <div key={p.id} className="bg-zinc-800 rounded-3xl p-8 hover:bg-zinc-700 transition">
                    <div className="flex justify-between">
                      <div>
                        <h4 className="font-semibold text-xl">{p.nome_cliente}</h4>
                        <p className="text-sm text-zinc-500 mt-1">
                          {new Date(p.created_at).toLocaleDateString('pt-PT')}
                        </p>
                      </div>
                      <button
                        onClick={() => downloadPDF(p.proposta_texto, p.nome_cliente)}
                        className="text-emerald-400 hover:text-emerald-500"
                      >
                        <Download className="w-6 h-6" />
                      </button>
                    </div>
                    <p className="text-zinc-400 mt-4 line-clamp-3">{p.descricao}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
