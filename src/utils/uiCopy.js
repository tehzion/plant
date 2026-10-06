const copy = {
 en: { historyHint: 'Review recent scans, revisit diagnoses, and keep your field timeline organized.', search: 'Search scans', crop: 'Crop', status: 'Status', date: 'Date range', sort: 'Sort', all: 'All', newest: 'Newest first', oldest: 'Oldest first', week: 'Last 7 days', month: 'Last 30 days', due: 'Follow-ups due', none: 'No scans match these filters.', reset: 'Reset filters', service: 'Scan service unavailable', inspect: 'Review next checks', care: 'Log care', retake: 'Retake photo', details: 'Scan details', searchLibrary: 'Search the plant library' },
 ms: { historyHint: 'Semak imbasan terkini, diagnosis dan rekod pemeriksaan ladang anda.', search: 'Cari imbasan', crop: 'Tanaman', status: 'Status', date: 'Julat tarikh', sort: 'Susunan', all: 'Semua', newest: 'Terbaharu dahulu', oldest: 'Terlama dahulu', week: '7 hari terakhir', month: '30 hari terakhir', due: 'Susulan perlu dibuat', none: 'Tiada imbasan sepadan dengan penapis ini.', reset: 'Tetapkan semula penapis', service: 'Perkhidmatan imbasan tidak tersedia', inspect: 'Semak pemeriksaan seterusnya', care: 'Catat penjagaan', retake: 'Ambil semula foto', details: 'Butiran imbasan', searchLibrary: 'Cari dalam pustaka tanaman' },
 zh: { historyHint: '查看近期扫描、诊断和田间检查记录。', search: '搜索扫描', crop: '作物', status: '状态', date: '日期范围', sort: '排序', all: '全部', newest: '最新优先', oldest: '最早优先', week: '最近7天', month: '最近30天', due: '待跟进', none: '没有符合筛选条件的扫描。', reset: '重置筛选', service: '扫描服务不可用', inspect: '查看下一步检查', care: '记录护理', retake: '重新拍照', details: '扫描详情', searchLibrary: '搜索植物资料库' }
};
export const getUiCopy = language => copy[language] || copy.en;
export const isFollowUpDue = (scan, now = new Date()) => {
 const date = scan?.followUp?.nextCheckDate;
 if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '') || !Number.isFinite(new Date(date).getTime())) return false;
 const history = scan.followUp.history || [];
 if (history.at(-1)?.outcome === 'resolved') return false;
 const today = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
 return date <= today;
};
