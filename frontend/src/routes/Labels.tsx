'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Eye, Tags, RefreshCcw, Download, Search, Settings, BarChart3, Globe, Edit2, ChevronDown, ChevronRight } from 'lucide-react'

// Mock data for demonstration - combined labels with usage
const mockLabels = [
  { 
    name: 'environment', 
    description: 'Deployment environment identifier',
    values: ['production', 'staging', 'development'], 
    type: 'all',
    usedIn: ['workflow-deployment', 'workflow-testing', 'metric-cpu-usage', 'metric-memory']
  },
  { 
    name: 'service', 
    description: 'Service component identifier',
    values: ['api', 'web', 'worker', 'database'], 
    type: 'workflows',
    usedIn: ['workflow-api-deploy', 'workflow-web-build', 'metric-request-count']
  },
  { 
    name: 'version', 
    description: 'Application version tracking',
    values: ['v1.0', 'v1.1', 'v2.0'], 
    type: 'metrics',
    usedIn: ['metric-deployment-frequency', 'metric-rollback-rate']
  },
  { 
    name: 'region', 
    description: 'Geographic deployment region',
    values: ['us-east', 'us-west', 'eu-central'], 
    type: 'all',
    usedIn: ['workflow-regional-backup', 'metric-latency', 'metric-availability']
  },
  { 
    name: 'team', 
    description: 'Responsible team identifier',
    values: ['backend', 'frontend', 'devops'], 
    type: 'workflows',
    usedIn: ['workflow-team-deploy', 'workflow-code-review']
  },
  { 
    name: 'priority', 
    description: 'Alert or task priority level',
    values: ['high', 'medium', 'low'], 
    type: 'metrics',
    usedIn: ['metric-alert-priority', 'metric-incident-priority']
  },
]

const mockRenamedValues = [
  { label: 'environment', value: 'prod', displayValue: 'Production' },
  { label: 'environment', value: 'dev', displayValue: 'Development' },
  { label: 'priority', value: 'p1', displayValue: 'High Priority' },
  { label: 'priority', value: 'p2', displayValue: 'Medium Priority' },
  { label: 'priority', value: 'p3', displayValue: 'Low Priority' },
  { label: 'status', value: 'ok', displayValue: 'Healthy' },
  { label: 'status', value: 'warn', displayValue: 'Warning' },
  { label: 'status', value: 'error', displayValue: 'Critical' },
]

export default function LabelsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'workflows' | 'metrics'>('all')
  const [renamedSearch, setRenamedSearch] = useState('')
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  const filteredLabels = mockLabels.filter(label => {
    const matchesSearch = label.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      label.usedIn.some(usage => usage.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesType = filterType === 'all' || label.type === filterType || label.type === 'all'
    return matchesSearch && matchesType
  })

  const filteredRenamedValues = mockRenamedValues.filter(item =>
    item.label.toLowerCase().includes(renamedSearch.toLowerCase()) ||
    item.value.toLowerCase().includes(renamedSearch.toLowerCase()) ||
    item.displayValue.toLowerCase().includes(renamedSearch.toLowerCase())
  )

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'workflows':
        return <Settings className="h-4 w-4" />
      case 'metrics':
        return <BarChart3 className="h-4 w-4" />
      case 'all':
        return <Globe className="h-4 w-4" />
      default:
        return <Tags className="h-4 w-4" />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'workflows':
        return 'text-orange-600' // Precise/specific operations
      case 'metrics':
        return 'text-blue-600'  // Precise/specific data
      case 'all':
        return 'text-green-600' // Global/universal scope
      default:
        return 'text-gray-600'
    }
  }

  const handleRefresh = () => {
    console.log('Refreshing labels data...')
  }

  const handleExport = () => {
    console.log('Exporting labels data...')
  }

  const toggleRowExpansion = (labelName: string, event: React.MouseEvent) => {
    event.stopPropagation()
    const newExpandedRows = new Set(expandedRows)
    if (expandedRows.has(labelName)) {
      newExpandedRows.delete(labelName)
    } else {
      newExpandedRows.add(labelName)
    }
    setExpandedRows(newExpandedRows)
  }

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Label Management</h2>
          <p className="text-gray-500">
            Manage labels, their values, renamed displays, and usage across workflows and metrics
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="default" onClick={handleRefresh}>
            <RefreshCcw className="h-4 w-4" />
            <span className="ml-2 hidden lg:inline">Refresh</span>
          </Button>
          <Button variant="outline" size="default" onClick={handleExport}>
            <Download className="h-4 w-4" />
            <span className="ml-2 hidden lg:inline">Export</span>
          </Button>
        </div>
      </div>

      {/* Section 1 & 2: Labels Table and Renamed Values side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Labels Table - 2/3 width */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Tags className="h-5 w-5" />
                Labels Overview
              </CardTitle>
              <CardDescription>
                View all labels and their associated values
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-4 mb-4">
                <div className="flex items-center space-x-2">
                  <Search className="h-4 w-4" />
                  <Input
                    placeholder="Search labels and usage..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-64"
                  />
                </div>
                <Select value={filterType} onValueChange={(value: 'all' | 'workflows' | 'metrics') => setFilterType(value)}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Labels</SelectItem>
                    <SelectItem value="workflows">Workflows Only</SelectItem>
                    <SelectItem value="metrics">Metrics Only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12"></TableHead>
                    <TableHead>Label</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Values</TableHead>
                    <TableHead>Used In</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLabels.map((label) => {
                    const isExpanded = expandedRows.has(label.name)
                    return (
                      <>
                        {/* Main Row */}
                        <TableRow 
                          key={label.name}
                          className="hover:bg-muted/50"
                        >
                          <TableCell>
                            <button
                              onClick={(e) => toggleRowExpansion(label.name, e)}
                              className="p-1 hover:bg-muted rounded"
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4" />
                              ) : (
                                <ChevronRight className="h-4 w-4" />
                              )}
                            </button>
                          </TableCell>
                          <TableCell className="font-medium">
                            <div className="flex items-center gap-2">
                              <span className={getTypeColor(label.type)}>
                                {getTypeIcon(label.type)}
                              </span>
                              {label.name}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-xs">
                            <div className="flex items-center gap-2">
                              <span className="truncate">{label.description}</span>
                              <Edit2 className="h-3 w-3 opacity-50 hover:opacity-100" />
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {label.values.slice(0, 3).map((value) => (
                                <Badge key={value} variant="secondary" className="text-xs">
                                  {value}
                                </Badge>
                              ))}
                              {label.values.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{label.values.length - 3} more
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {label.usedIn.slice(0, 3).map((usage) => (
                                <Badge 
                                  key={usage} 
                                  variant={usage.startsWith('workflow') ? 'secondary' : 'outline'}
                                  className="text-xs"
                                >
                                  {usage}
                                </Badge>
                              ))}
                              {label.usedIn.length > 3 && (
                                <Badge variant="outline" className="text-xs">
                                  +{label.usedIn.length - 3} more
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>

                        {/* Expanded Row */}
                        {isExpanded && (
                          <TableRow key={`${label.name}-expanded`}>
                            <TableCell colSpan={5} className="p-0 bg-muted/20">
                              <Card className="m-4 shadow-sm">
                                <CardContent className="p-6">
                                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                    {/* Left Panel - Value Mappings */}
                                    <div>
                                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                                        <Tags className="h-4 w-4" />
                                        Value Mappings
                                      </h4>
                                      <div className="space-y-2">
                                        {label.values.map((value) => {
                                          const renamedValue = mockRenamedValues.find(
                                            r => r.label === label.name && r.value === value
                                          )
                                          return (
                                            <div key={value} className="flex items-center gap-2 p-3 border rounded">
                                              <Badge variant="outline" className="font-mono text-xs min-w-fit">
                                                {value}
                                              </Badge>
                                              <span className="text-sm text-muted-foreground">→</span>
                                              <Input 
                                                className="text-sm h-8"
                                                defaultValue={renamedValue?.displayValue || value}
                                                placeholder="Display name..."
                                              />
                                              <Edit2 className="h-3 w-3 text-muted-foreground" />
                                            </div>
                                          )
                                        })}
                                      </div>
                                    </div>

                                    {/* Right Panel - Usage */}
                                    <div>
                                      <h4 className="font-semibold mb-3 flex items-center gap-2">
                                        <Eye className="h-4 w-4" />
                                        Used In ({label.usedIn.length})
                                      </h4>
                                      <div className="space-y-2">
                                        {label.usedIn.map((usage) => (
                                          <div key={usage} className="flex items-center gap-2 p-3 border rounded">
                                            <div className="flex items-center gap-2">
                                              <span className={usage.startsWith('workflow') ? 'text-orange-600' : 'text-blue-600'}>
                                                {usage.startsWith('workflow') ? 
                                                  <Settings className="h-4 w-4" /> : 
                                                  <BarChart3 className="h-4 w-4" />
                                                }
                                              </span>
                                              <Badge 
                                                variant={usage.startsWith('workflow') ? 'secondary' : 'outline'}
                                                className="text-xs"
                                              >
                                                {usage}
                                              </Badge>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    )
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Renamed Values Card - 1/3 width */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Renamed Values
              </CardTitle>
              <CardDescription>
                Custom display names for label values
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="flex items-center space-x-2">
                  <Search className="h-4 w-4" />
                  <Input
                    placeholder="Search renamed values..."
                    value={renamedSearch}
                    onChange={(e) => setRenamedSearch(e.target.value)}
                    className="w-full"
                  />
                </div>
              </div>
              <div className="space-y-3">
                {Object.entries(
                  filteredRenamedValues.reduce((acc, item) => {
                    if (!acc[item.label]) acc[item.label] = []
                    acc[item.label].push(item)
                    return acc
                  }, {} as Record<string, typeof filteredRenamedValues>)
                ).map(([label, items]) => (
                  <div key={label} className="space-y-2">
                    <h4 className="font-medium text-sm text-gray-600">{label}</h4>
                    {items.map((item) => (
                      <div key={`${item.label}-${item.value}`} className="flex items-center space-x-2 ml-4 p-2 rounded border-l-2 border-blue-200 bg-gray-50">
                        <Badge variant="outline" className="font-mono text-xs">
                          {item.value}
                        </Badge>
                        <span className="text-sm">→</span>
                        <span className="text-sm font-medium">{item.displayValue}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}