'use client';

import { useState, useRef, useEffect } from 'react';
import { Upload, FileText, Download, Trash2, File as FileIcon, CheckCircle2 } from 'lucide-react';
import { api, apiUpload } from '@/lib/api';
import { cn } from '@/lib/utils';

type Arquivo = {
  id: number;
  nome_original: string;
  nome_arquivo: string;
  mimetype: string;
  tamanho: number;
  categoria: string;
  uploaded_em: string;
  user_nome?: string;
  url: string;
};

type Props = {
  pedidoId: number;
  categoria?: string;
  onUploaded?: (arq: Arquivo) => void;
  onChange?: (arquivos: Arquivo[]) => void;
};

function formatTamanho(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileUpload({ pedidoId, categoria = 'documento', onUploaded, onChange }: Props) {
  const [arquivos, setArquivos] = useState<Arquivo[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    try {
      const r = await api.get<{ data: Arquivo[] }>(`/api/pedidos/${pedidoId}/arquivos`);
      setArquivos(r.data || []);
      onChange?.(r.data || []);
    } catch (e: any) { setErro(e.message); }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [pedidoId]);

  const onUpload = async (files: FileList | File[]) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    setErro(null);
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('categoria', categoria);
        const r = await apiUpload<{ data: Arquivo }>(`/api/pedidos/${pedidoId}/arquivos`, fd);
        onUploaded?.(r.data);
      }
      await load();
    } catch (e: any) {
      setErro(e.message || 'Erro ao enviar');
    } finally {
      setUploading(false);
    }
  };

  const onRemover = async (arq: Arquivo) => {
    if (!confirm(`Remover "${arq.nome_original}"?`)) return;
    try {
      await api.delete(`/api/pedidos/${pedidoId}/arquivos/${arq.id}`);
      await load();
    } catch (e: any) { setErro(e.message); }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files) onUpload(e.dataTransfer.files);
  };

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        className={cn(
          'rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-colors',
          dragOver ? 'border-brand-500 bg-brand-50/40' : 'border-ink-300 hover:border-brand-400 bg-ink-50/30',
        )}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".doc,.docx,.pdf,.odt,.txt,.png,.jpg,.jpeg"
          className="hidden"
          onChange={(e) => e.target.files && onUpload(e.target.files)}
        />
        <Upload className={cn('w-8 h-8 mx-auto', dragOver ? 'text-brand-600' : 'text-ink-400')} />
        <p className="mt-2 text-sm font-medium text-ink-900">
          {uploading ? 'Enviando...' : 'Arraste o arquivo ou clique aqui'}
        </p>
        <p className="text-xs text-ink-500 mt-1">
          .doc, .docx, .pdf, .odt, .txt, .png, .jpg (até 10MB)
        </p>
      </div>

      {erro && (
        <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-2">
          {erro}
        </div>
      )}

      {/* Lista */}
      {arquivos.length > 0 && (
        <div className="space-y-1.5">
          {arquivos.map((a) => (
            <div key={a.id} className="flex items-center gap-3 border border-ink-200 rounded-lg p-2.5 bg-white">
              <FileText className="w-5 h-5 text-brand-600 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-ink-900 truncate">{a.nome_original}</div>
                <div className="text-xs text-ink-500">
                  {formatTamanho(a.tamanho)} • {a.user_nome || 'Sistema'} • {new Date(a.uploaded_em).toLocaleString('pt-BR')}
                </div>
              </div>
              <a
                href={a.url}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 text-ink-500 hover:text-brand-700 hover:bg-brand-50 rounded"
                title="Baixar"
              >
                <Download className="w-4 h-4" />
              </a>
              <button
                onClick={() => onRemover(a)}
                className="p-1.5 text-ink-500 hover:text-red-600 hover:bg-red-50 rounded"
                title="Remover"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
