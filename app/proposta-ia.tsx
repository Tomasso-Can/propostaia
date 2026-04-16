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
      alert('Preenche o nome do cliente e a descrição.');
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
          descricao,
          proposta_texto: data.proposta,
        });

        if (!error) {
          setMensagemSucesso('Proposta gerada e guardada!');
          await carregarHistorico();
        }
      }
    } catch (e) {
      alert('Erro ao gerar proposta.');
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = (propostaTexto: string, nomeClientePDF: string) => {
    const doc = new jsPDF();
    doc.text(propostaTexto, 10, 10);
    doc.save(`Proposta_${nomeClientePDF}.pdf`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 to-zinc-900 text-white">
      <div className="max-w-6xl mx-auto px-6 py-16">
        <div className="text-center mb-16">
          <h1 className="text-6xl font-bold mb-4">PropostaIA</h1>
          <p className="text-2xl text-zinc-400">Propostas profissionais com um clique</p>
        </div>

        <div className="flex justify-center gap-8 mb-12 border-b border-zinc-800 pb-6">
          <button
            onClick={() => setAbaAtiva('nova')}
            className={`px-8 py-3 text-lg font-medium rounded-full transition ${abaAtiva === 'nova' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'}`}
          >
            Nova Proposta
          </button>
          <button
            onClick={() => {
              setAbaAtiva('historico');
              carregarHistorico();
            }}
            className={`px-8 py-3 text-lg font-medium rounded-full transition ${abaAtiva === 'historico' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'}`}
          >
            Histórico
          </button>
        </div>

        {abaAtiva === 'nova' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Formulário */}
            <div className="bg-zinc-900 p-10 rounded-3xl">
              <h2 className="text-3xl font-semibold mb-8">Criar Proposta</h2>
              <input
                type="text"
                value={nomeCliente}
                onChange={(e) => setNomeCliente(e.target.value)}
                placeholder="Nome do Cliente"
                className="w-full p-5 rounded-2xl bg-zinc-800 border border-zinc-700 mb-6 text-lg"
              />
              <textarea
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Descreve o projeto..."
                className="w-full h-80 p-6 rounded-3xl bg-zinc-800 border border-zinc-700 text-lg"
              />
              <button
                onClick={gerarProposta}
                disabled={loading}
                className="mt-8 w-full bg-emerald-600 hover:bg-emerald-500 py-5 rounded-2xl text-xl font-semibold disabled:opacity-50"
              >
                {loading ? 'A gerar...' : 'Gerar Proposta'}
              </button>
            </div>

            {/* Preview */}
            <div className="bg-zinc-900 p-10 rounded-3xl">
              <h2 className="text-3xl font-semibold mb-8">Pré-visualização</h2>
              <div className="min-h-[500px] bg-zinc-950 p-10 rounded-3xl border border-zinc-800 text-zinc-300 whitespace-pre-wrap">
                {proposta || "A proposta aparecerá aqui..."}
              </div>
              {proposta && (
                <button
                  onClick={() => downloadPDF(proposta, nomeCliente)}
                  className="mt-6 w-full bg-white text-black py-4 rounded-2xl font-semibold"
                >
                  Download PDF
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
