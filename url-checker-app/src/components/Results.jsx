import { useState } from 'react'
import { Download, RotateCcw, Filter, AlertCircle, CheckCircle, XCircle, ArrowRight, Copy, Check, Square, CheckSquare, MinusSquare } from 'lucide-react'
import ErrorDetails from './ErrorDetails'
import ExportDialog from './ExportDialog'

function Results({ results, onReset }) {
  const [filter, setFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [showExportDialog, setShowExportDialog] = useState(false)
  const [copiedColumns, setCopiedColumns] = useState(new Set())
  const [selectedRows, setSelectedRows] = useState(new Set())
  const [selectAll, setSelectAll] = useState(false)

  const handleExport = (exportType, filename) => {
    // Use selected rows if any, otherwise use all filtered results
    let dataToExport = selectedRows.size > 0 
      ? results.results.filter((_, index) => selectedRows.has(index))
      : results.results;
    
    let format = 'csv';
    
    if (exportType === 'csv-404') {
      dataToExport = dataToExport.filter(r => r.is_404);
    } else if (exportType === 'json') {
      format = 'json';
    }
    
    const data = format === 'json' 
      ? JSON.stringify(dataToExport, null, 2)
      : exportType === 'redirect-csv'
      ? convertToRedirectCSV(dataToExport)
      : convertToCSV(dataToExport);
    
    const fileExtension = format === 'json' ? 'json' : 'csv';
    const fullFilename = `${filename}.${fileExtension}`;
    
    const blob = new Blob([data], { 
      type: format === 'json' ? 'application/json' : 'text/csv' 
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fullFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  const convertToCSV = (data) => {
    const headers = ['original_url', 'status_code', 'final_url', 'is_404', 'error', 'suggested_redirect', 'match_score', 'checked_at']
    const rows = data.map(row => 
      headers.map(header => {
        const value = row[header]
        return typeof value === 'string' && value.includes(',') 
          ? `"${value}"` 
          : value
      }).join(',')
    )
    return [headers.join(','), ...rows].join('\n')
  }

  const convertToRedirectCSV = (data) => {
    const headers = ['source', 'target']
    const rows = data
      .filter(row => row.is_404 && row.suggested_redirect) // Only 404s with suggestions
      .map(row => {
        // Use final_url if available, otherwise original_url
        const fullSource = (row.final_url || row.original_url || '').trim()
        
        // Extract just the path from the source URL (keep leading slash)
        let sourcePath = '/'
        try {
          const url = new URL(fullSource)
          sourcePath = url.pathname + url.search + url.hash
          // Ensure it starts with /
          if (!sourcePath.startsWith('/')) {
            sourcePath = '/' + sourcePath
          }
        } catch (e) {
          // If URL parsing fails, try to extract path manually
          const match = fullSource.match(/https?:\/\/[^\/]+(\/.*)/)
          sourcePath = match && match[1] ? match[1] : '/'
        }
        
        const target = (row.suggested_redirect || '').trim()
        
        return [
          sourcePath.includes(',') ? `"${sourcePath}"` : sourcePath,
          target.includes(',') ? `"${target}"` : target
        ].join(',')
      })
    return [headers.join(','), ...rows].join('\n')
  }

  const getFilteredResults = () => {
    let filtered = results.results

    if (filter === '404') {
      filtered = filtered.filter(r => r.is_404)
    } else if (filter === '200') {
      filtered = filtered.filter(r => r.status_code === 200)
    } else if (filter === 'error') {
      filtered = filtered.filter(r => r.error)
    }

    if (searchTerm) {
      filtered = filtered.filter(r => 
        r.original_url.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    return filtered
  }


  const copyColumnData = (columnName) => {
    let columnData = []
    
    filteredResults.forEach(result => {
      let value = ''
      switch(columnName) {
        case 'url':
          value = result.original_url ? result.original_url.trim() : ''
          break
        case 'status':
          value = result.status_code || 'N/A'
          break
        case 'final_url':
          if (result.final_url) {
            // Extract just the path from the URL
            try {
              const url = new URL(result.final_url.trim())
              value = url.pathname + url.search + url.hash
              // Remove leading slash if present
              if (value.startsWith('/')) {
                value = value.substring(1)
              }
            } catch (e) {
              // If URL parsing fails, try to extract path manually
              const match = result.final_url.trim().match(/https?:\/\/[^\/]+\/(.*)/)
              value = match && match[1] ? match[1] : ''
            }
          } else {
            value = ''
          }
          break
        case 'suggested_redirect':
          value = result.suggested_redirect ? result.suggested_redirect.trim() : ''
          break
        case 'error':
          value = result.error ? result.error.trim() : ''
          break
        case 'checked_at':
          value = new Date(result.checked_at).toLocaleString('th-TH')
          break
      }
      columnData.push(value)
    })
    
    const dataString = columnData.join('\n')
    
    navigator.clipboard.writeText(dataString).then(() => {
      setCopiedColumns(prev => new Set([...prev, columnName]))
      setTimeout(() => {
        setCopiedColumns(prev => {
          const newSet = new Set(prev)
          newSet.delete(columnName)
          return newSet
        })
      }, 2000)
    })
  }

  const filteredResults = getFilteredResults()

  const handleSelectAll = (checked) => {
    if (checked) {
      const allIndices = new Set(filteredResults.map((_, index) => 
        results.results.indexOf(filteredResults[index])
      ))
      setSelectedRows(allIndices)
    } else {
      setSelectedRows(new Set())
    }
    setSelectAll(checked)
  }

  const handleRowSelect = (index, checked) => {
    const newSelected = new Set(selectedRows)
    if (checked) {
      newSelected.add(index)
    } else {
      newSelected.delete(index)
    }
    setSelectedRows(newSelected)
    
    // Update select all state
    if (newSelected.size === 0) {
      setSelectAll(false)
    } else if (newSelected.size === filteredResults.length) {
      setSelectAll(true)
    }
  }

  const getSelectionIcon = () => {
    if (selectedRows.size === 0) {
      return <Square size={18} />
    } else if (selectedRows.size === filteredResults.length) {
      return <CheckSquare size={18} />
    } else {
      return <MinusSquare size={18} />
    }
  }

  return (
    <div className="results">
      <div className="results-header">
        <h2>ผลการตรวจสอบ {selectedRows.size > 0 && <span className="selected-count">({selectedRows.size} รายการที่เลือก)</span>}</h2>
        <div className="results-actions">
          <button 
            className="btn btn-primary" 
            onClick={() => setShowExportDialog(true)}
          >
            <Download size={20} />
            Export {selectedRows.size > 0 ? `${selectedRows.size} รายการ` : 'ผลลัพธ์'}
          </button>
          <button className="btn btn-outline" onClick={onReset}>
            <RotateCcw size={20} />
            ตรวจสอบใหม่
          </button>
        </div>
      </div>

      <ExportDialog
        isOpen={showExportDialog}
        onClose={() => setShowExportDialog(false)}
        onExport={handleExport}
        resultCount={selectedRows.size > 0 ? selectedRows.size : results.results.length}
        selectedCount={selectedRows.size}
      />

      <div className="summary">
        <h3>สรุปผล</h3>
        <div className="stats-grid">
          <div className="stat-card total">
            <span className="stat-value">{results.summary.total}</span>
            <span className="stat-label">URLs ทั้งหมด</span>
          </div>
          <div className="stat-card error">
            <span className="stat-value">{results.summary.status_404}</span>
            <span className="stat-label">404 Not Found</span>
            <span className="stat-percent">
              {((results.summary.status_404 / results.summary.total) * 100).toFixed(1)}%
            </span>
          </div>
          <div className="stat-card success">
            <span className="stat-value">{results.summary.status_200}</span>
            <span className="stat-label">200 OK</span>
            <span className="stat-percent">
              {((results.summary.status_200 / results.summary.total) * 100).toFixed(1)}%
            </span>
          </div>
          <div className="stat-card warning">
            <span className="stat-value">{results.summary.errors}</span>
            <span className="stat-label">Connection Errors</span>
          </div>
          {results.summary.with_suggestions > 0 && (
            <div className="stat-card info">
              <span className="stat-value">{results.summary.with_suggestions}</span>
              <span className="stat-label">With Redirect Suggestions</span>
            </div>
          )}
        </div>
      </div>

      <div className="results-table-section">
        <div className="table-controls">
          <div className="filter-buttons">
            <button 
              className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              ทั้งหมด ({results.results.length})
            </button>
            <button 
              className={`filter-btn error ${filter === '404' ? 'active' : ''}`}
              onClick={() => setFilter('404')}
            >
              <XCircle size={16} />
              404 ({results.summary.status_404})
            </button>
            <button 
              className={`filter-btn success ${filter === '200' ? 'active' : ''}`}
              onClick={() => setFilter('200')}
            >
              <CheckCircle size={16} />
              200 ({results.summary.status_200})
            </button>
            <button 
              className={`filter-btn warning ${filter === 'error' ? 'active' : ''}`}
              onClick={() => setFilter('error')}
            >
              <AlertCircle size={16} />
              Errors ({results.summary.errors})
            </button>
          </div>
          <input
            type="text"
            placeholder="ค้นหา URL..."
            className="search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <div className="results-table">
          <table>
            <thead>
              <tr>
                <th className="checkbox-column">
                  <label className="custom-checkbox">
                    <input 
                      type="checkbox"
                      checked={selectAll}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      ref={input => {
                        if (input) {
                          input.indeterminate = selectedRows.size > 0 && selectedRows.size < filteredResults.length;
                        }
                      }}
                    />
                    <span className="checkbox-mark"></span>
                  </label>
                </th>
                <th className="clickable-header" onClick={() => copyColumnData('url')}>
                  <span>URL</span>
                  <button className="column-copy-btn" title="Copy column">
                    {copiedColumns.has('url') ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </th>
                <th className="clickable-header" onClick={() => copyColumnData('status')}>
                  <span>Status</span>
                  <button className="column-copy-btn" title="Copy column">
                    {copiedColumns.has('status') ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </th>
                <th className="clickable-header" onClick={() => copyColumnData('final_url')}>
                  <span>Final URL</span>
                  <button className="column-copy-btn" title="Copy column">
                    {copiedColumns.has('final_url') ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </th>
                <th className="clickable-header" onClick={() => copyColumnData('suggested_redirect')}>
                  <span>Suggested Redirect</span>
                  <button className="column-copy-btn" title="Copy column">
                    {copiedColumns.has('suggested_redirect') ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </th>
                <th className="clickable-header" onClick={() => copyColumnData('error')}>
                  <span>Error</span>
                  <button className="column-copy-btn" title="Copy column">
                    {copiedColumns.has('error') ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </th>
                <th className="clickable-header" onClick={() => copyColumnData('checked_at')}>
                  <span>Checked At</span>
                  <button className="column-copy-btn" title="Copy column">
                    {copiedColumns.has('checked_at') ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredResults.map((result, index) => {
                const realIndex = results.results.indexOf(result);
                const isSelected = selectedRows.has(realIndex);
                return (
                <tr key={index} className={`${result.is_404 ? 'row-error' : result.status_code === 200 ? 'row-success' : 'row-warning'} ${isSelected ? 'row-selected' : ''}`}>
                  <td className="checkbox-column">
                    <label className="custom-checkbox">
                      <input 
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleRowSelect(realIndex, !isSelected)}
                      />
                      <span className="checkbox-mark"></span>
                    </label>
                  </td>
                  <td className="url-cell">
                    <a href={result.original_url} target="_blank" rel="noopener noreferrer">
                      {result.original_url}
                    </a>
                  </td>
                  <td>
                    <span className={`status-badge ${result.is_404 ? 'status-404' : result.status_code === 200 ? 'status-200' : 'status-other'}`}>
                      {result.status_code || 'N/A'}
                    </span>
                  </td>
                  <td className="url-cell">
                    {result.final_url ? (
                      result.final_url !== result.original_url ? (
                        <a href={result.final_url} target="_blank" rel="noopener noreferrer" className="redirected">
                          → {result.final_url}
                        </a>
                      ) : (
                        <a href={result.final_url} target="_blank" rel="noopener noreferrer">
                          {result.final_url}
                        </a>
                      )
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="url-cell">
                    {result.suggested_redirect ? (
                      <div className="suggested-redirect">
                        <a href={result.suggested_redirect} target="_blank" rel="noopener noreferrer">
                          <ArrowRight size={16} className="redirect-icon" />
                          {result.suggested_redirect}
                        </a>
                        {result.match_score > 0 ? (
                          <span className="match-score">
                            Match: {(result.match_score * 100).toFixed(0)}%
                          </span>
                        ) : (
                          <span className="match-score homepage">
                            Homepage (Default)
                          </span>
                        )}
                      </div>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="error-cell">
                    {result.error ? (
                      <ErrorDetails error={result.error} />
                    ) : (
                      '-'
                    )}
                  </td>
                  <td>{new Date(result.checked_at).toLocaleString('th-TH')}</td>
                </tr>
              )})}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default Results