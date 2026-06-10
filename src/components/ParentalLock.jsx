import { useState } from 'react';
import { motion } from 'framer-motion';

/**
 * ParentalLock — 아이 이름 설정 모달
 * 부모가 앱 시작 전에 아이 이름을 입력하면
 * TTS 칭찬 시 이름을 불러줌.
 */
export default function ParentalLock({ childName, onSave, onClose }) {
  const [name, setName] = useState(childName === '친구' ? '' : childName);

  const handleSave = () => {
    const trimmed = name.trim();
    onSave(trimmed || '친구');
  };

  return (
    <motion.div
      className="absolute inset-0 flex items-center justify-center z-50"
      style={{ backdropFilter: 'blur(8px)', background: 'rgba(0,0,0,0.6)' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      // 배경 클릭 시 닫기
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        className="bg-white rounded-3xl p-8 w-80 shadow-2xl flex flex-col gap-5"
        initial={{ scale: 0.75, y: 40 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.75, y: 40 }}
        transition={{ type: 'spring', stiffness: 400, damping: 28 }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* 제목 */}
        <div className="text-center">
          <div className="text-5xl mb-2">⚙️</div>
          <h2 className="text-2xl font-black text-purple-800">설정</h2>
        </div>

        {/* 이름 입력 */}
        <div>
          <label className="block text-sm font-bold text-gray-500 mb-2 text-center">
            👶 아이 이름을 입력해요
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            className="w-full border-2 border-purple-300 rounded-2xl px-4 py-3 text-2xl font-black text-gray-800 text-center focus:outline-none focus:border-purple-500 transition-colors"
            placeholder="예: 민우"
            maxLength={10}
            autoFocus
          />
          <p className="text-xs text-gray-400 text-center mt-2">
            이름을 입력하면 동물 친구들이 이름을 불러줘요 💕
          </p>
        </div>

        {/* 현재 이름 미리보기 */}
        {(name.trim() || childName !== '친구') && (
          <motion.div
            className="bg-purple-50 rounded-2xl py-3 px-4 text-center"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
          >
            <span className="text-purple-700 font-bold text-sm">
              🦁 "{name.trim() || childName}아, 최고야!" 라고 불러줄게요
            </span>
          </motion.div>
        )}

        {/* 버튼 */}
        <div className="flex gap-3">
          <motion.button
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl border-2 border-gray-200 text-gray-500 font-bold text-lg"
            whileTap={{ scale: 0.95 }}
          >
            취소
          </motion.button>
          <motion.button
            onClick={handleSave}
            className="flex-1 py-3 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 text-white font-black text-lg shadow-lg"
            whileTap={{ scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400 }}
          >
            저장 ✨
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}
