import { useMemo, useRef, useState } from 'react'

const branches = ['Jakarta', 'Bandung', 'Surabaya', 'Medan']
const months = ['Jan', 'Feb', 'Mar']
const sales = [
  [120, 135, 128],
  [98, 108, 112],
  [145, 138, 152],
  [87, 95, 103],
]
const aprilStart = [132, 117, 160, 108]
const defaultMonthFactors = [1, 1.04, 1.08]
const defaultBranchFactors = [1.05, 0.98, 1.08, 0.97]
const fmt = (value) => Number(value).toFixed(2)
const sum = (items) => items.reduce((total, item) => total + item, 0)

const topics = [
  { id: 'shape', label: 'Bentuk' },
  { id: 'indexing', label: 'Indexing' },
  { id: 'reshape', label: 'Reshape' },
  { id: 'broadcast', label: 'Broadcasting' },
  { id: 'mask', label: 'Mask' },
  { id: 'axis', label: 'Axis' },
]

function Matrix({ title, columns, rows, data, className = '', renderCell, selection, onSelectionStart, onSelectionExtend, rowLabelTitle = 'Cabang' }) {
  const tableWrapRef = useRef(null)
  const activePointerId = useRef(null)
  const canSelectRange = Boolean(selection && onSelectionStart && onSelectionExtend)

  function startSelection(event, rowIndex, columnIndex) {
    if (!canSelectRange || event.button !== 0) return
    event.preventDefault()
    event.currentTarget.focus()
    activePointerId.current = event.pointerId
    tableWrapRef.current?.setPointerCapture(event.pointerId)
    onSelectionStart(rowIndex, columnIndex)
  }

  function extendSelectionFromPointer(event) {
    if (!canSelectRange || activePointerId.current !== event.pointerId) return
    const cell = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-grid-row]')
    if (!cell || !tableWrapRef.current?.contains(cell)) return
    onSelectionExtend(Number(cell.dataset.gridRow), Number(cell.dataset.gridColumn))
  }

  function endSelection(event) {
    if (activePointerId.current !== event.pointerId) return
    activePointerId.current = null
    if (tableWrapRef.current?.hasPointerCapture(event.pointerId)) {
      tableWrapRef.current.releasePointerCapture(event.pointerId)
    }
  }

  function moveSelectionWithKeyboard(event, rowIndex, columnIndex) {
    if (!canSelectRange) return
    const directions = {
      ArrowUp: [-1, 0],
      ArrowDown: [1, 0],
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1],
    }
    const direction = directions[event.key]
    if (!direction) return
    event.preventDefault()

    const nextRow = Math.max(0, Math.min(rows.length - 1, rowIndex + direction[0]))
    const nextColumn = Math.max(0, Math.min(columns.length - 1, columnIndex + direction[1]))
    if (event.shiftKey) onSelectionExtend(nextRow, nextColumn)
    else onSelectionStart(nextRow, nextColumn)

    event.currentTarget.closest('table')
      ?.querySelector(`[data-grid-row="${nextRow}"][data-grid-column="${nextColumn}"]`)
      ?.focus()
  }

  const firstSelectedRow = selection ? Math.min(selection.start[0], selection.end[0]) : -1
  const lastSelectedRow = selection ? Math.max(selection.start[0], selection.end[0]) : -1
  const firstSelectedColumn = selection ? Math.min(selection.start[1], selection.end[1]) : -1
  const lastSelectedColumn = selection ? Math.max(selection.start[1], selection.end[1]) : -1

  return (
    <section className={`panel matrix-panel ${className}`}>
      {title && <h2 className="panel-title">{title}</h2>}
      <div
        className={`table-wrap ${canSelectRange ? 'is-sliceable' : ''}`}
        ref={tableWrapRef}
        onPointerMove={canSelectRange ? extendSelectionFromPointer : undefined}
        onPointerUp={canSelectRange ? endSelection : undefined}
        onPointerCancel={canSelectRange ? endSelection : undefined}
        onLostPointerCapture={() => { activePointerId.current = null }}
      >
        <table className="matrix" aria-label={canSelectRange ? `${title}, pilih rentang sel` : undefined}>
          <thead>
            <tr>
              <th scope="col" className="row-label">{rowLabelTitle}</th>
              {columns.map((column) => <th scope="col" key={column}>{column}</th>)}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIndex) => (
              <tr key={rows[rowIndex]}>
                <th scope="row" className="row-label">{rows[rowIndex]}</th>
                {row.map((value, columnIndex) => {
                  const isSelected = rowIndex >= firstSelectedRow && rowIndex <= lastSelectedRow
                    && columnIndex >= firstSelectedColumn && columnIndex <= lastSelectedColumn
                  const content = renderCell ? renderCell(value, rowIndex, columnIndex) : value
                  return (
                    <td
                      key={`${rowIndex}-${columnIndex}`}
                      className={`${isSelected ? 'is-range-selected' : ''} ${canSelectRange ? 'is-slice-cell' : ''}`}
                      data-grid-row={canSelectRange ? rowIndex : undefined}
                      data-grid-column={canSelectRange ? columnIndex : undefined}
                      onPointerDown={canSelectRange ? (event) => startSelection(event, rowIndex, columnIndex) : undefined}
                      onKeyDown={canSelectRange ? (event) => moveSelectionWithKeyboard(event, rowIndex, columnIndex) : undefined}
                      tabIndex={canSelectRange ? (selection.start[0] === rowIndex && selection.start[1] === columnIndex ? 0 : -1) : undefined}
                      aria-label={canSelectRange ? `${rows[rowIndex]}, ${columns[columnIndex]}: ${value}${isSelected ? ', terpilih' : ''}` : undefined}
                    >{content}</td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function Vector({ title, labels, values, valueFormat = (value) => value, accent = false }) {
  return (
    <section className={`panel vector-panel ${accent ? 'vector-accent' : ''}`}>
      {title && <h2 className="panel-title">{title}</h2>}
      <div className="vector-strip">
        {values.map((value, index) => (
          <div className="vector-item" key={`${labels[index]}-${index}`}>
            <span className="vector-label">{labels[index]}</span>
            <span className="vector-value">{valueFormat(value)}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

function FactorEditor({ title, labels, values, onChange, step = '0.01', decimals = 2 }) {
  return (
    <section className="panel factor-panel">
      <h2 className="panel-title">{title}</h2>
      <div className="factor-grid" style={{ '--factor-count': labels.length }}>
        {labels.map((label, index) => (
          <label className="factor-field" key={label}>
            <span>{label}</span>
            <input
              type="number"
              aria-label={`${title} ${label}`}
              min="0"
              max="3"
              step={step}
              value={values[index]}
              onChange={(event) => onChange(index, Number(event.target.value || 0))}
            />
          </label>
        ))}
      </div>
    </section>
  )
}

function CodeCard({ children }) {
  const [copied, setCopied] = useState(false)
  const code = Array.isArray(children) ? children.join('\n') : String(children)
  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1200)
    } catch {
      setCopied(false)
    }
  }
  return (
    <div className="code-card">
      <code>{code}</code>
      <button type="button" className="copy-button" onClick={copyCode} aria-label="Salin kode">
        {copied ? 'Tersalin' : 'Salin'}
      </button>
    </div>
  )
}

function ShapeView({ selectedArray, setSelectedArray }) {
  const isSales = selectedArray === 'sales'
  return (
    <>
      <PageHeading title="Bentuk array" subtitle="Cek struktur data sebelum mulai mengolahnya." />
      <div className="choice-row" role="group" aria-label="Pilih array">
        <button className={`choice ${isSales ? 'active' : ''}`} onClick={() => setSelectedArray('sales')} aria-pressed={isSales}>penjualan</button>
        <button className={`choice ${!isSales ? 'active' : ''}`} onClick={() => setSelectedArray('target')} aria-pressed={!isSales}>target_bulan</button>
      </div>
      <div className="shape-layout">
        {isSales ? (
          <Matrix title="penjualan" columns={months} rows={branches} data={sales} />
        ) : (
          <Vector title="target_bulan" labels={months} values={[110, 115, 120]} />
        )}
        <div className="metric-grid">
          <Metric label="ndim" value={isSales ? '2' : '1'} />
          <Metric label="shape" value={isSales ? '(4, 3)' : '(3,)'} />
          <Metric label="size" value={isSales ? '12' : '3'} />
          <Metric label="dtype" value="int64" />
        </div>
      </div>
      <ShapeLine>{isSales ? '4 baris × 3 kolom' : '3 nilai dalam satu dimensi'}</ShapeLine>
      <CodeCard>{isSales ? 'penjualan.shape' : 'target_bulan.dtype'}</CodeCard>
    </>
  )
}

function IndexingView() {
  const [selection, setSelection] = useState({ start: [0, 1], end: [2, 2] })
  const rowStart = Math.min(selection.start[0], selection.end[0])
  const rowEnd = Math.max(selection.start[0], selection.end[0])
  const columnStart = Math.min(selection.start[1], selection.end[1])
  const columnEnd = Math.max(selection.start[1], selection.end[1])
  const selectedBranches = branches.slice(rowStart, rowEnd + 1)
  const selectedMonths = months.slice(columnStart, columnEnd + 1)
  const selectedData = sales.slice(rowStart, rowEnd + 1).map((row) => row.slice(columnStart, columnEnd + 1))
  const isSingleCell = rowStart === rowEnd && columnStart === columnEnd
  const sliceExpression = isSingleCell
    ? `penjualan[${rowStart}, ${columnStart}]`
    : `penjualan[${rowStart}:${rowEnd + 1}, ${columnStart}:${columnEnd + 1}]`

  return (
    <>
      <PageHeading title="Indexing & slicing" subtitle="Klik satu sel untuk indexing, atau seret untuk memilih beberapa baris dan kolom." />
      <div className="slice-hint">
        <span className="slice-selection-key" aria-hidden="true" />
        <span>Seret pada tabel untuk mengambil irisan berbentuk persegi panjang.</span>
        <kbd>Shift + tombol panah</kbd>
      </div>
      <div className="index-layout">
        <Matrix
          title="penjualan · seret untuk memilih"
          columns={months}
          rows={branches}
          data={sales}
          selection={selection}
          onSelectionStart={(rowIndex, columnIndex) => setSelection({ start: [rowIndex, columnIndex], end: [rowIndex, columnIndex] })}
          onSelectionExtend={(rowIndex, columnIndex) => setSelection((current) => ({ ...current, end: [rowIndex, columnIndex] }))}
        />
        <div className="index-detail">
          {isSingleCell ? (
            <div className="selected-value panel">
              <span>{branches[rowStart]} · {months[columnStart]}</span>
              <strong>{sales[rowStart][columnStart]}</strong>
              <code>{sliceExpression}</code>
            </div>
          ) : (
            <Matrix
              title={`Hasil slice · (${selectedBranches.length}, ${selectedMonths.length})`}
              columns={selectedMonths}
              rows={selectedBranches}
              data={selectedData}
              className="result-panel"
            />
          )}
          <div className="slice-range panel">
            <span>Rentang indeks</span>
            <strong>baris {rowStart}:{rowEnd + 1} · kolom {columnStart}:{columnEnd + 1}</strong>
          </div>
        </div>
      </div>
      <ShapeLine>{isSingleCell ? 'Satu nilai · indexing menghasilkan scalar' : `Hasil slice berbentuk (${selectedBranches.length}, ${selectedMonths.length})`}</ShapeLine>
      <CodeCard>{sliceExpression}</CodeCard>
    </>
  )
}

function ReshapeView({ reshapeMode, setReshapeMode }) {
  const transposed = reshapeMode === 'transpose'
  const matrix = transposed ? sales[0].map((_, columnIndex) => sales.map((row) => row[columnIndex])) : sales
  const rowLabels = transposed ? months : branches
  const columnLabels = transposed ? branches : months
  const flat = sales.flat()
  return (
    <>
      <PageHeading title="Reshape & transpose" subtitle="Susun ulang array tanpa mengubah nilainya." />
      <div className="choice-row" role="group" aria-label="Pilih bentuk hasil">
        <button className={`choice ${!transposed ? 'active' : ''}`} onClick={() => setReshapeMode('reshape')} aria-pressed={!transposed}>reshape (4, 3)</button>
        <button className={`choice ${transposed ? 'active' : ''}`} onClick={() => setReshapeMode('transpose')} aria-pressed={transposed}>transpose (3, 4)</button>
      </div>
      <div className="transform-layout">
        <section className="panel raw-panel">
          <h2 className="panel-title">raw_q1 · shape (12,)</h2>
          <div className="raw-values">
            {flat.map((value, index) => <span key={index}>{value}</span>)}
          </div>
        </section>
        <div className="transform-arrow" aria-hidden="true">→</div>
        <Matrix title={transposed ? 'tabel_bulan' : 'tabel_cabang'} columns={columnLabels} rows={rowLabels} data={matrix} rowLabelTitle={transposed ? 'Bulan' : 'Cabang'} />
      </div>
      <ShapeLine>(12,) → {transposed ? '(3, 4)' : '(4, 3)'}</ShapeLine>
      <CodeCard>{transposed ? 'tabel_bulan = tabel_cabang.T' : 'tabel_cabang = raw_q1.reshape(4, 3)'}</CodeCard>
    </>
  )
}

function BroadcastView({ mode, setMode, monthFactors, setMonthFactors, branchFactors, setBranchFactors }) {
  const perMonth = mode === 'month'
  const projected = perMonth
    ? sales.map((row) => row.map((value, index) => value * monthFactors[index]))
    : sales.map((row, index) => row.map((value) => value * branchFactors[index]))
  const labels = perMonth ? months : branches
  const factors = perMonth ? monthFactors : branchFactors
  const update = (index, value) => {
    if (perMonth) setMonthFactors(factors.map((factor, i) => i === index ? value : factor))
    else setBranchFactors(factors.map((factor, i) => i === index ? value : factor))
  }
  return (
    <>
      <PageHeading title="Broadcasting" subtitle="Ubah faktor untuk melihat hasil." />
      <div className="choice-row" role="group" aria-label="Arah broadcasting">
        <button className={`choice ${perMonth ? 'active' : ''}`} onClick={() => setMode('month')} aria-pressed={perMonth}>Per bulan</button>
        <button className={`choice ${!perMonth ? 'active' : ''}`} onClick={() => setMode('branch')} aria-pressed={!perMonth}>Per cabang</button>
      </div>
      <div className="broadcast-layout">
        <div className="broadcast-source">
          <Matrix title="Penjualan" columns={months} rows={branches} data={sales} />
          <FactorEditor title={perMonth ? 'Faktor per bulan' : 'Faktor per cabang'} labels={labels} values={factors} onChange={update} />
        </div>
        <div className="transform-arrow" aria-hidden="true">→</div>
        <Matrix
          title={perMonth ? 'Hasil · penjualan × faktor_bulan' : 'Hasil · penjualan × faktor_cabang'}
          columns={months}
          rows={branches}
          data={projected}
          className="result-panel"
          renderCell={(value) => fmt(value)}
        />
      </div>
      <ShapeLine>(4, 3) × {perMonth ? '(3,)' : '(4, 1)'} → (4, 3)</ShapeLine>
      <CodeCard>{perMonth ? 'proyeksi_q1 = penjualan * faktor_bulan' : 'proyeksi_q1 = penjualan * faktor_cabang.reshape(4, 1)'}</CodeCard>
    </>
  )
}

function MaskView({ monthFactors, targets, setTargets }) {
  const projected = sales.map((row) => row.map((value, index) => value * monthFactors[index]))
  const status = projected.map((row) => row.map((value, index) => value >= targets[index]))
  return (
    <>
      <PageHeading title="Boolean mask & np.where" subtitle="Atur target bulan. Sel berubah saat target tercapai." />
      <div className="mask-layout">
        <Matrix
          title="Status proyeksi"
          columns={months}
          rows={branches}
          data={projected}
          className="status-matrix"
          renderCell={(value, rowIndex, columnIndex) => (
            <span className={`status-value ${status[rowIndex][columnIndex] ? 'met' : 'below'}`}>
              <span className="status-icon" aria-hidden="true">{status[rowIndex][columnIndex] ? '✓' : '·'}</span>
              {fmt(value)}
            </span>
          )}
        />
        <div className="mask-controls">
          <FactorEditor
            title="Target bulanan"
            labels={months}
            values={targets}
            decimals={0}
            step="1"
            onChange={(index, value) => setTargets(targets.map((target, i) => i === index ? value : target))}
          />
          <div className="legend-row">
            <span><i className="legend-dot met-dot" /> Mencapai target</span>
            <span><i className="legend-dot below-dot" /> Di bawah target</span>
          </div>
        </div>
      </div>
      <ShapeLine>proyeksi_q1 ≥ target_bulan</ShapeLine>
      <CodeCard>{'status = np.where(proyeksi_q1 >= target_bulan, "Mencapai target", "Di bawah target")'}</CodeCard>
    </>
  )
}

function AxisView({ axis, setAxis, monthFactors }) {
  const projected = sales.map((row) => row.map((value, index) => value * monthFactors[index]))
  const perBranch = axis === 1
  const labels = perBranch ? branches : months
  const values = perBranch
    ? projected.map((row) => sum(row))
    : months.map((_, columnIndex) => sum(projected.map((row) => row[columnIndex])))
  const maxIndex = values.indexOf(Math.max(...values))
  return (
    <>
      <PageHeading title="Agregasi dengan axis" subtitle="Pilih arah penjumlahan untuk mengganti hasil." />
      <div className="choice-row" role="group" aria-label="Pilih axis">
        <button className={`choice ${perBranch ? 'active' : ''}`} onClick={() => setAxis(1)} aria-pressed={perBranch}>Per cabang · axis=1</button>
        <button className={`choice ${!perBranch ? 'active' : ''}`} onClick={() => setAxis(0)} aria-pressed={!perBranch}>Per bulan · axis=0</button>
      </div>
      <div className="axis-layout">
        <Matrix title="Proyeksi Q1" columns={months} rows={branches} data={projected} renderCell={(value) => fmt(value)} />
        <section className="panel totals-panel">
          <h2 className="panel-title">Total {perBranch ? 'per cabang' : 'per bulan'}</h2>
          <div className="bar-list">
            {values.map((value, index) => (
              <div className={`bar-row ${index === maxIndex ? 'top-row' : ''}`} key={labels[index]}>
                <span className="bar-label">{labels[index]}</span>
                <div className="bar-track"><span className="bar-fill" style={{ width: `${(value / Math.max(...values)) * 100}%` }} /></div>
                <strong>{fmt(value)}</strong>
              </div>
            ))}
          </div>
          <div className="top-total"><span>Terbesar</span><strong>{labels[maxIndex]} · {fmt(values[maxIndex])}</strong></div>
        </section>
      </div>
      <ShapeLine>{perBranch ? '(4, 3) → (4,)' : '(4, 3) → (3,)'}</ShapeLine>
      <CodeCard>{perBranch ? 'total_per_cabang = proyeksi_q1.sum(axis=1)' : 'total_per_bulan = proyeksi_q1.sum(axis=0)'}</CodeCard>
    </>
  )
}

function AprilView({ aprilValues, setAprilValues, aprilFactor, setAprilFactor, monthFactors }) {
  const allFactors = [...monthFactors, aprilFactor]
  const baseMatrix = sales.map((row, index) => [...row, aprilValues[index]])
  const projected = baseMatrix.map((row) => row.map((value, index) => value * allFactors[index]))
  const allMonths = [...months, 'Apr']
  return (
    <>
      <PageHeading title="Gabungkan data April" subtitle="Tambah satu kolom, lalu terapkan faktor bulanan." />
      <div className="april-layout">
        <div className="april-before">
          <Matrix title="Penjualan Q1" columns={months} rows={branches} data={sales} />
          <FactorEditor
            title="Nilai dasar April"
            labels={branches}
            values={aprilValues}
            decimals={0}
            step="1"
            onChange={(index, value) => setAprilValues(aprilValues.map((item, i) => i === index ? value : item))}
          />
        </div>
        <div className="transform-arrow" aria-hidden="true">→</div>
        <div className="april-after">
          <Matrix title="Proyeksi Januari–April" columns={allMonths} rows={branches} data={projected} className="result-panel" renderCell={(value) => fmt(value)} />
          <FactorEditor title="Faktor April" labels={['Apr']} values={[aprilFactor]} onChange={(_, value) => setAprilFactor(value)} />
        </div>
      </div>
      <ShapeLine>(4, 3) + (4, 1) → (4, 4) · lalu × (4,)</ShapeLine>
      <CodeCard>{[
        'penjualan_4bulan = np.concatenate((penjualan, april_dasar), axis=1)',
        'proyeksi_4bulan = penjualan_4bulan * faktor_4bulan',
      ]}</CodeCard>
    </>
  )
}

function PageHeading({ title, subtitle }) {
  return <div className="page-heading"><h1>{title}</h1><p>{subtitle}</p></div>
}

function Metric({ label, value }) {
  return <div className="metric panel"><span>{label}</span><strong>{value}</strong></div>
}

function ShapeLine({ children }) {
  return <div className="shape-line"><span>{children}</span></div>
}

function App() {
  const [topic, setTopic] = useState('broadcast')
  const [selectedArray, setSelectedArray] = useState('sales')
  const [reshapeMode, setReshapeMode] = useState('reshape')
  const [broadcastMode, setBroadcastMode] = useState('month')
  const [monthFactors, setMonthFactors] = useState(defaultMonthFactors)
  const [branchFactors, setBranchFactors] = useState(defaultBranchFactors)
  const [targets, setTargets] = useState([110, 115, 120])
  const [axis, setAxis] = useState(1)
  const selectedTitle = useMemo(() => topics.find((item) => item.id === topic)?.label ?? 'NumPy', [topic])

  function resetAll() {
    setTopic('broadcast')
    setSelectedArray('sales')
    setReshapeMode('reshape')
    setBroadcastMode('month')
    setMonthFactors(defaultMonthFactors)
    setBranchFactors(defaultBranchFactors)
    setTargets([110, 115, 120])
    setAxis(1)
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="#top" onClick={(event) => event.preventDefault()}>NumPy <span>Visualisasi</span></a>
        <div className="topbar-right"><span className="dataset-note">Data penjualan · 4 cabang</span><button type="button" className="reset-button" onClick={resetAll}>Reset</button></div>
      </header>
      <div className="workspace" id="top">
        <aside className="sidebar" aria-label="Topik NumPy">
          <nav className="topic-nav">
            {topics.map((item, index) => (
              <button
                className={`topic-button ${topic === item.id ? 'selected' : ''}`}
                key={item.id}
                onClick={() => setTopic(item.id)}
                aria-current={topic === item.id ? 'page' : undefined}
                aria-label={`${index + 1}. ${item.label}`}
              >
                <span className="topic-index">{String(index + 1).padStart(2, '0')}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
          <div className="sidebar-foot"><span className="live-dot" /> Dataset simulasi</div>
        </aside>
        <main className="main-content" aria-label={selectedTitle}>
          {topic === 'shape' && <ShapeView selectedArray={selectedArray} setSelectedArray={setSelectedArray} />}
          {topic === 'indexing' && <IndexingView />}
          {topic === 'reshape' && <ReshapeView reshapeMode={reshapeMode} setReshapeMode={setReshapeMode} />}
          {topic === 'broadcast' && <BroadcastView mode={broadcastMode} setMode={setBroadcastMode} monthFactors={monthFactors} setMonthFactors={setMonthFactors} branchFactors={branchFactors} setBranchFactors={setBranchFactors} />}
          {topic === 'mask' && <MaskView monthFactors={monthFactors} targets={targets} setTargets={setTargets} />}
          {topic === 'axis' && <AxisView axis={axis} setAxis={setAxis} monthFactors={monthFactors} />}
        </main>
      </div>
    </div>
  )
}

export default App
