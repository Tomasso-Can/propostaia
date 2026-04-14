'use client';

import { useState, useEffect } from 'react';
import { Download, Loader2, Clock, CheckCircle } from 'lucide-react';
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
  const [salvando, setSalvando] = useState(false);
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
      alert('Preenche todos os campos!');
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

        setSalvando(true);
        const { error } = await supabase.from('propostas').insert({
          user_id: user.id,
          nome_cliente: nomeCliente,
          descricao: descricao,
          proposta_texto: data.proposta,
        });

        if (error) {
          console.error('Erro ao guardar:', error);
        } else {
          setMensagemSucesso('Proposta gerada e guardada com sucesso!');
          await carregarHistorico();
          setTimeout(() => setMensagemSucesso(''), 4000);
        }
      } else {
        alert(data.error || 'Erro ao gerar a proposta.');
      }
    } catch (error) {
      console.error(error);
      alert('Erro ao gerar ou guardar a proposta. Tenta novamente.');
    } finally {
      setLoading(false);
      setSalvando(false);
    }
  };

  const downloadPDF = (propostaTexto: string, nomeClientePDF: string) => {
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 52;

    doc.setFillColor(245, 248, 255);
    doc.rect(0, 0, pageWidth, 297, 'F');

    doc.setTextColor(30, 64, 175);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(37);
    doc.text("PROPOSTA", pageWidth / 2, y, { align: "center" });

    y += 28;
    doc.setFontSize(29);
    doc.text("COMERCIAL", pageWidth / 2, y, { align: "center" });

    y += 68;
    doc.setTextColor(0);
    doc.setFontSize(16);
    doc.text("Para", pageWidth / 2, y, { align: "center" });

    y += 16;
    doc.setFontSize(21);
    doc.text(nomeClientePDF, pageWidth / 2, y, { align: "center" });

    y += 62;
    doc.setFontSize(12);
    doc.setTextColor(70);
    doc.text(`Preparada por: ${user.email}`, pageWidth / 2, y, { align: "center" });

    y += 13;
    doc.text(new Date().toLocaleDateString('pt-PT', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }), pageWidth / 2, y, { align: "center" });

    doc.addPage();
    y = 35;

    doc.setTextColor(30, 64, 175);
    doc.setFontSize(20);
    doc.text("Proposta Comercial", pageWidth / 2, y, { align: "center" });

    y += 18;
    doc.setDrawColor(30, 64, 175);
    doc.setLineWidth(0.9);
    doc.line(35, y, pageWidth - 35, y);

    y += 25;

    doc.setTextColor(0);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12.8);
    const lines = doc.splitTextToSize(propostaTexto, pageWidth - 48);

    lines.forEach((line: string) => {
      if (y > 275) {
        doc.addPage();
        y = 35;
      }
      doc.text(line, 26, y);
      y += 8;
    });

    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(9.5);
      doc.setTextColor(110);
      doc.text("Gerado por PropostaIA", pageWidth / 2, 287, { align: "center" });
    }

    const nomeFicheiro = `Proposta_${nomeClientePDF.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
    doc.save(nomeFicheiro);
  };

  return (
    <div className="max-w-6xl mx-auto px-6 py-12">
      <div className="text-center mb-12">
        <h2 className="text-4xl font-bold text-gray-900 mb-4">PropostaIA</h2>
        <p className="text-gray-600 text-lg">Gera e guarda as tuas propostas profissionais</p>
      </div>

      <div className="flex border-b mb-8">
        <button
          onClick={() => setAbaAtiva('nova')}
          className={`px-6 py-3 font-medium ${abaAtiva === 'nova' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
        >
          Nova Proposta
        </button>
        <button
          onClick={() => {
            setAbaAtiva('historico');
            carregarHistorico();
          }}
          className={`px-6 py-3 font-medium flex items-center gap-2 ${abaAtiva === 'historico' ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-600'}`}
        >
          <Clock className="w-4 h-4" />
          Histórico ({propostasSalvas.length})
        </button>
      </div>

      {abaAtiva === 'nova' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div className="bg-white rounded-3xl shadow-xl p-10">
            <h3 className="text-2xl font-semibold mb-6">Nova Proposta</h3>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Nome do Cliente</label>
              <input
                type="text"
                value={nomeCliente}
                onChange={(e) => setNomeCliente(e.target.value)}
                placeholder="Ex: Dr. João Silva"
                className="w-full p-4 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Descrição do Projeto</label>
              <textarea
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Descreve detalhadamente o projeto..."
                className="w-full h-80 p-6 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-base resize-y"
              />
            </div>

            <button
              onClick={gerarProposta}
              disabled={loading || !descricao.trim() || !nomeCliente.trim()}
              className="mt-8 w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-4 rounded-2xl text-lg flex items-center justify-center gap-3"
            >
              {loading ? (
                <> <Loader2 className="w-5 h-5 animate-spin" /> A gerar com IA... </>
              ) : (
                'Gerar Proposta Profissional'
              )}
            </button>

            {mensagemSucesso && (
              <div className="mt-4 flex items-center gap-2 text-green-600 text-sm justify-center">
                <CheckCircle className="w-5 h-5" />
                {mensagemSucesso}
              </div>
            )}
          </div>

          <div className="bg-white rounded-3xl shadow-xl p-10 flex flex-col">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-semibold">Proposta Gerada</h3>
              {proposta && (
                <button
                  onClick={() => downloadPDF(proposta, nomeCliente)}
                  className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-2xl text-sm font-medium"
                >
                  <Download className="w-5 h-5" />
                  Download PDF
                </button>
              )}
            </div>

            {proposta ? (
              <div className="flex-1 bg-gray-50 p-8 rounded-2xl overflow-auto text-sm leading-relaxed whitespace-pre-wrap border border-gray-200">
                {proposta}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-gray-400 border border-dashed border-gray-300 rounded-2xl">
                A proposta aparecerá aqui
              </div>
            )}
          </div>
        </div>
      )}

      {abaAtiva === 'historico' && (
        <div className="bg-white rounded-3xl shadow-xl p-8">
          <h3 className="text-2xl font-semibold mb-6">Histórico de Propostas</h3>
          {propostasSalvas.length === 0 ? (
            <p className="text-gray-500 text-center py-12">Ainda não tens propostas guardadas.</p>
          ) : (
            <div className="space-y-6">
              {propostasSalvas.map((p) => (
                <div key={p.id} className="border rounded-2xl p-6 hover:shadow-md transition">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold text-lg">{p.nome_cliente}</h4>
                      <p className="text-sm text-gray-500">
                        {new Date(p.created_at).toLocaleDateString('pt-PT')}
                      </p>
                    </div>
                    <button
                      onClick={() => downloadPDF(p.proposta_texto, p.nome_cliente)}
                      className="flex items-center gap-2 text-green-600 hover:text-green-700"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                  </div>
                  <p className="text-sm text-gray-600 mt-3 line-clamp-3">{p.descricao}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
