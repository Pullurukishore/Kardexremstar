'use client';

import { Control } from 'react-hook-form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AlertCircle, FileText, MapPin, Phone } from 'lucide-react';

interface Zone {
  id: number;
  name: string;
  description?: string;
  isActive: boolean;
}

interface TicketBasicInfoFormProps {
  control: Control<any>;
  zones: Zone[];
  isSubmitting: boolean;
  hideZoneSelector?: boolean;
}

export function TicketBasicInfoForm({ control, zones, isSubmitting, hideZoneSelector = false }: TicketBasicInfoFormProps) {
  return (
    <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50">
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-lg border-b">
        <div className="flex items-center space-x-3">
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
            <FileText className="h-4 w-4 text-white" />
          </div>
          <div>
            <CardTitle className="text-lg text-gray-800">Ticket Information</CardTitle>
            <CardDescription>Basic details about the support ticket</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 p-6">
        <FormField
          control={control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input 
                  placeholder="Enter ticket title" 
                  {...field} 
                  disabled={isSubmitting}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe the issue in detail..."
                  className="min-h-[120px]"
                  disabled={isSubmitting}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={control}
          name="callType"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="flex items-center space-x-2">
                <Phone className="h-4 w-4 text-green-500" />
                <span>Call Type</span>
              </FormLabel>
              <Select 
                onValueChange={field.onChange} 
                value={field.value}
                disabled={isSubmitting}
              >
                <FormControl>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select call type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="UNDER_MAINTENANCE_CONTRACT" className="text-blue-600">
                    <div className="flex items-center space-x-2">
                      <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                      <span>Under Maintenance Contract</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="NOT_UNDER_CONTRACT" className="text-orange-600">
                    <div className="flex items-center space-x-2">
                      <div className="h-2 w-2 rounded-full bg-orange-500"></div>
                      <span>Not under the contract</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={control}
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center space-x-2">
                  <AlertCircle className="h-4 w-4 text-orange-500" />
                  <span>Priority</span>
                </FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  value={field.value}
                  disabled={isSubmitting}
                >
                  <FormControl>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="LOW" className="text-green-600">
                      <div className="flex items-center space-x-2">
                        <div className="h-2 w-2 rounded-full bg-green-500"></div>
                        <span>Low Priority</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="MEDIUM" className="text-yellow-600">
                      <div className="flex items-center space-x-2">
                        <div className="h-2 w-2 rounded-full bg-yellow-500"></div>
                        <span>Medium Priority</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="HIGH" className="text-red-600">
                      <div className="flex items-center space-x-2">
                        <div className="h-2 w-2 rounded-full bg-red-500"></div>
                        <span>High Priority</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={control}
            name="zoneId"
            render={({ field }) => {
              const selectedZone = zones.find(zone => zone.id === field.value);
              
              return (
                <FormItem>
                  <FormLabel className="flex items-center space-x-2">
                    <MapPin className="h-4 w-4 text-blue-500" />
                    <span>Service Zone</span>
                  </FormLabel>
                  
                  {hideZoneSelector ? (
                    <div className="flex items-center space-x-2 p-2 border rounded-md bg-gray-50 text-gray-700">
                      <MapPin className="h-4 w-4 text-blue-500 flex-shrink-0" />
                      <span className="font-medium">
                        {selectedZone?.name || 'No zone selected'}
                      </span>
                    </div>
                  ) : (
                    <Select 
                      onValueChange={(value) => field.onChange(value === 'all' ? 'all' : Number(value))} 
                      value={field.value?.toString()}
                      disabled={isSubmitting || zones.length === 0}
                    >
                      <FormControl>
                        <SelectTrigger className="focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                          <SelectValue placeholder={zones.length === 0 ? 'No zones available' : 'Select service zone'} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Array.isArray(zones) && zones.length > 0 ? (
                          <>
                            <SelectItem key="all" value="all">
                              <div className="flex items-center space-x-2">
                                <MapPin className="h-3 w-3 text-green-500" />
                                <span className="font-medium">All Zones</span>
                                <span className="text-xs text-gray-500 ml-1">(Show all customers)</span>
                              </div>
                            </SelectItem>
                            {zones.filter(zone => zone.isActive).map((zone) => (
                              <SelectItem key={zone.id} value={zone.id.toString()}>
                                <div className="flex items-center space-x-2">
                                  <MapPin className="h-3 w-3 text-blue-500" />
                                  <span>{zone.name}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </>
                        ) : (
                          <SelectItem value="" disabled>
                            No active zones available
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  )}
                  <FormMessage />
                </FormItem>
              );
            }}
          />
        </div>
      </CardContent>
    </Card>
  );
}
