import * as React from 'react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'

export default function TimeRangePicker({ startTime, endTime, onChange }) {
  const handleChange = (field) => (e) => {
    const value = e.target.value
    onChange({
      startTime: field === 'startTime' ? value : startTime,
      endTime:   field === 'endTime'   ? value : endTime,
    })
  }

  const renderTimeField = (id, label, value, changeHandler) => (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-sm font-medium text-gray-700">
        {label}
      </Label>
      <div className="relative">
        <Input
          id={id}
          type="time"
          className="pl-10 pr-3 py-2"
          value={value}
          onChange={changeHandler}
        />
      </div>
    </div>
  )

  return (
    <div className="grid grid-cols-2 gap-6">
      {renderTimeField(
        'startTime',
        'Start Time',
        startTime,
        handleChange('startTime')
      )}
      {renderTimeField(
        'endTime',
        'End Time',
        endTime,
        handleChange('endTime')
      )}
    </div>
  )
}
