import { useEffect, useMemo, useState } from 'react';
import { supabase } from './supabaseClient';

function App() {
  const [memos, setMemos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMemo, setEditingMemo] = useState(null); // null = 새 메모

  // -------- 초기 로딩: 메모 리스트 가져오기 --------
  useEffect(() => {
    fetchMemos();
  }, []);

  async function fetchMemos() {
    setLoading(true);
    const { data, error } = await supabase
      .from('memos')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('fetchMemos error', error);
    } else {
      setMemos(data || []);
    }
    setLoading(false);
  }

  // -------- 메모 생성 --------
  async function handleCreateMemo(title, content) {
    const { data, error } = await supabase
      .from('memos')
      .insert({ title, content })
      .select()
      .single();

    if (error) {
      console.error('createMemo error', error);
      return;
    }

    setMemos(prev => [data, ...prev]);
  }

  // -------- 메모 수정 --------
  async function handleUpdateMemo(id, title, content) {
    const { data, error } = await supabase
      .from('memos')
      .update({ title, content, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('updateMemo error', error);
      return;
    }

    setMemos(prev => prev.map(m => (m.id === id ? data : m)));
  }

  // -------- 메모 삭제 --------
  async function handleDeleteMemo(id) {
    if (!window.confirm('정말 이 메모를 삭제할까요?')) return;

    const { error } = await supabase.from('memos').delete().eq('id', id);
    if (error) {
      console.error('deleteMemo error', error);
      return;
    }

    setMemos(prev => prev.filter(m => m.id !== id));
  }

  // -------- 모달 열기/닫기 --------
  function openNewMemoModal() {
    setEditingMemo(null);
    setIsModalOpen(true);
  }

  function openEditMemoModal(memo) {
    setEditingMemo(memo);
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
  }

  // -------- 검색 필터 --------
  const filteredMemos = useMemo(() => {
    if (!search.trim()) return memos;
    const lower = search.toLowerCase();
    return memos.filter(
      m =>
        m.title.toLowerCase().includes(lower) ||
        m.content.toLowerCase().includes(lower),
    );
  }, [memos, search]);

  return (
    <div className="app-root">
      {/* 헤더 */}
      <header className="header">
        <div className="header-left">
          <span className="logo-icon">📝</span>
          <span className="logo-text">메모앱</span>
        </div>
        <button className="btn-primary" onClick={openNewMemoModal}>
          + 새 메모
        </button>
      </header>

      {/* 검색창 */}
      <div className="search-wrapper">
        <input
          className="search-input"
          placeholder="메모 검색..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <span className="search-icon">🔍</span>
      </div>

      {/* 메인 콘텐츠 */}
      <main className="content">
        {loading ? (
          <div className="empty-state">
            <div className="empty-icon">📄</div>
            <div className="empty-title">불러오는 중입니다...</div>
          </div>
        ) : filteredMemos.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📄</div>
            <div className="empty-title">메모가 없습니다</div>
            <div className="empty-subtitle">새 메모를 작성해보세요!</div>
          </div>
        ) : (
          <div className="memo-grid">
            {filteredMemos.map(memo => (
              <MemoCard
                key={memo.id}
                memo={memo}
                onEdit={() => openEditMemoModal(memo)}
                onDelete={() => handleDeleteMemo(memo.id)}
              />
            ))}
          </div>
        )}
      </main>

      {isModalOpen && (
        <MemoModal
          initialMemo={editingMemo}
          onClose={closeModal}
          onSubmit={async (title, content) => {
            if (editingMemo) {
              await handleUpdateMemo(editingMemo.id, title, content);
            } else {
              await handleCreateMemo(title, content);
            }
            closeModal();
          }}
        />
      )}
    </div>
  );
}

function MemoCard({ memo, onEdit, onDelete }) {
  const created = new Date(memo.created_at);
  const now = new Date();
  const isToday =
    created.toDateString() === now.toDateString() ? '오늘' : '';

  const dateLabel = isToday
    ? '오늘'
    : created.toLocaleDateString('ko-KR', {
        month: 'short',
        day: 'numeric',
      });

  return (
    <div className="memo-card">
      <div className="memo-card-header">
        <h3 className="memo-title">{memo.title}</h3>
        <div className="memo-actions">
          <button className="icon-btn edit" onClick={onEdit} title="수정">
            ✏️
          </button>
          <button className="icon-btn delete" onClick={onDelete} title="삭제">
            🗑️
          </button>
        </div>
      </div>
      <p className="memo-content">{memo.content}</p>
      <div className="memo-footer">{dateLabel}</div>
    </div>
  );
}

function MemoModal({ initialMemo, onClose, onSubmit }) {
  const [title, setTitle] = useState(initialMemo?.title ?? '');
  const [content, setContent] = useState(initialMemo?.content ?? '');

  function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim()) {
      alert('제목을 입력하세요.');
      return;
    }
    onSubmit(title.trim(), content.trim());
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        onClick={e => {
          e.stopPropagation();
        }}
      >
        <div className="modal-header">
          <h2>{initialMemo ? '메모 수정' : '새 메모'}</h2>
          <button className="icon-btn" onClick={onClose}>
            ✕
          </button>
        </div>
        <form className="modal-body" onSubmit={handleSubmit}>
          <input
            className="modal-input"
            placeholder="제목을 입력하세요..."
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
          <textarea
            className="modal-textarea"
            placeholder="메모 내용을 입력하세요..."
            value={content}
            onChange={e => setContent(e.target.value)}
          />
          <div className="modal-footer">
            <button
              type="button"
              className="btn-secondary"
              onClick={onClose}
            >
              취소
            </button>
            <button type="submit" className="btn-primary">
              저장
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default App;
