"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import { User, Users, UserPlus, ChevronDown, Zap } from 'lucide-react';

interface AssignmentDropdownProps {
  onAssignToUser: () => void;
  onAssignToZone: () => void;
  hasZone: boolean;
  disabled?: boolean;
}

export function AssignmentDropdown({ 
  onAssignToUser, 
  onAssignToZone, 
  hasZone,
  disabled = false 
}: AssignmentDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          disabled={disabled}
          className="h-10 px-4 bg-gradient-to-r from-purple-50 to-pink-50 hover:from-purple-100 hover:to-pink-100 border-purple-200 hover:border-purple-300 text-purple-700 hover:text-purple-800 transition-all duration-200 shadow-sm hover:shadow-md group"
        >
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-full bg-purple-100 group-hover:bg-purple-200 transition-colors">
              <UserPlus className="h-3.5 w-3.5" />
            </div>
            <span className="font-medium">Assign Ticket</span>
            <ChevronDown className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180" />
          </div>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent className="w-64 p-2" align="end">
        <div className="px-2 py-1.5 text-sm font-medium text-muted-foreground border-b mb-2">
          Assignment Options
        </div>
        
        <DropdownMenuItem 
          onClick={onAssignToUser}
          className="p-3 cursor-pointer hover:bg-blue-50 rounded-lg transition-colors group"
        >
          <div className="flex items-center space-x-3 w-full">
            <div className="p-2 rounded-full bg-blue-100 group-hover:bg-blue-200 transition-colors">
              <User className="h-4 w-4 text-blue-600" />
            </div>
            <div className="flex-1">
              <div className="font-medium text-sm">Assign to Service Person</div>
              <div className="text-xs text-muted-foreground">Send directly to field technician</div>
            </div>
            <Zap className="h-4 w-4 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </DropdownMenuItem>
        
        {hasZone && (
          <>
            <DropdownMenuSeparator className="my-2" />
            <DropdownMenuItem 
              onClick={onAssignToZone}
              className="p-3 cursor-pointer hover:bg-emerald-50 rounded-lg transition-colors group"
            >
              <div className="flex items-center space-x-3 w-full">
                <div className="p-2 rounded-full bg-emerald-100 group-hover:bg-emerald-200 transition-colors">
                  <Users className="h-4 w-4 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <div className="font-medium text-sm">Assign to Zone User</div>
                  <div className="text-xs text-muted-foreground">Delegate to zone coordinator</div>
                </div>
                <Zap className="h-4 w-4 text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
