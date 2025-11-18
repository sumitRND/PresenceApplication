import { getDepartmentLocation, IIT_GUWAHATI_LOCATION } from '@/constants/geofenceLocation';
import { LatLng } from '@/types/geofence';

export interface ValidationResult {
  isValid: boolean;
  reason?: string;
  details: ValidationDetails;
}

export interface ValidationDetails {
  isWithinWorkingHours: boolean;
  isInsideIIT: boolean;
  isInsideDepartment: boolean;
  currentSession: 'FORENOON' | 'AFTERNOON' | 'OUTSIDE';
  userLocation: string;
  timeInfo: string;
  distance?: number;
}

interface WorkingHours {
  FORENOON: { start: number; end: number };
  AFTERNOON: { start: number; end: number };
}

class ValidationService {
  private static instance: ValidationService;
  
  private readonly WORKING_HOURS: WorkingHours = {
    FORENOON: { start: 540, end: 780 },
    AFTERNOON: { start: 780, end: 1050 }
  };
  
  private validationCache = new Map<string, { result: ValidationResult; timestamp: number }>();
  private readonly CACHE_DURATION = 60000;
  
  static getInstance(): ValidationService {
    if (!this.instance) {
      this.instance = new ValidationService();
    }
    return this.instance;
  }
  
  validateAttendance(
    userPosition: LatLng,
    departmentId: string,
    userLocationType: 'CAMPUS' | 'FIELDTRIP' | null
  ): ValidationResult {
    const cacheKey = `${userPosition.lat}_${userPosition.lng}_${departmentId}_${userLocationType}`;
    const cached = this.validationCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.result;
    }
    
    const result = this.performValidation(userPosition, departmentId, userLocationType);
    this.validationCache.set(cacheKey, { result, timestamp: Date.now() });
    this.cleanCache();
    
    return result;
  }
  
  private performValidation(
    userPosition: LatLng,
    departmentId: string,
    userLocationType: 'CAMPUS' | 'FIELDTRIP' | null
  ): ValidationResult {
    const timeCheck = this.checkWorkingHours();
    
    if (userLocationType === 'FIELDTRIP') {
      return {
        isValid: timeCheck.isValid,
        reason: timeCheck.isValid ? undefined : timeCheck.reason,
        details: {
          isWithinWorkingHours: timeCheck.isValid,
          isInsideIIT: false,
          isInsideDepartment: false,
          currentSession: timeCheck.session,
          userLocation: 'Outside IIT (Field Trip)',
          timeInfo: timeCheck.timeInfo,
        },
      };
    }
    
    const locationCheck = this.checkLocation(userPosition, departmentId);
    
    if (!timeCheck.isValid) {
      return {
        isValid: false,
        reason: timeCheck.reason,
        details: {
          ...locationCheck,
          isWithinWorkingHours: false,
          currentSession: timeCheck.session,
          timeInfo: timeCheck.timeInfo,
        },
      };
    }
    
    if (!locationCheck.isInsideIIT) {
      return {
        isValid: false,
        reason: 'You must be inside IIT Guwahati campus to mark attendance.',
        details: {
          ...locationCheck,
          isWithinWorkingHours: true,
          currentSession: timeCheck.session,
          timeInfo: timeCheck.timeInfo,
        },
      };
    }
    
    if (!locationCheck.isInsideDepartment) {
      const department = getDepartmentLocation(departmentId);
      const distanceInfo = locationCheck.distance 
        ? ` You are ${locationCheck.distance}m away from ${department?.label || 'your department'}.`
        : '';
      
      return {
        isValid: false,
        reason: `You must be within 200 meters of your department to mark attendance.${distanceInfo}`,
        details: {
          ...locationCheck,
          isWithinWorkingHours: true,
          currentSession: timeCheck.session,
          timeInfo: timeCheck.timeInfo,
        },
      };
    }
    
    return {
      isValid: true,
      details: {
        ...locationCheck,
        isWithinWorkingHours: true,
        currentSession: timeCheck.session,
        timeInfo: timeCheck.timeInfo,
      },
    };
  }
  
  private checkWorkingHours(): {
    isValid: boolean;
    session: 'FORENOON' | 'AFTERNOON' | 'OUTSIDE';
    timeInfo: string;
    reason?: string;
  } {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    
    if (currentMinutes >= this.WORKING_HOURS.FORENOON.start && 
        currentMinutes < this.WORKING_HOURS.FORENOON.end) {
      return {
        isValid: true,
        session: 'FORENOON',
        timeInfo: 'Forenoon Session (9:00 AM - 1:00 PM)',
      };
    }
    
    if (currentMinutes >= this.WORKING_HOURS.AFTERNOON.start && 
        currentMinutes <= this.WORKING_HOURS.AFTERNOON.end) {
      return {
        isValid: true,
        session: 'AFTERNOON',
        timeInfo: 'Afternoon Session (1:00 PM - 5:30 PM)',
      };
    }
    
    let nextSession = '';
    if (currentMinutes < this.WORKING_HOURS.FORENOON.start) {
      const minutesUntil = this.WORKING_HOURS.FORENOON.start - currentMinutes;
      const hours = Math.floor(minutesUntil / 60);
      const minutes = minutesUntil % 60;
      nextSession = `Next session starts in ${hours}h ${minutes}m (9:00 AM)`;
    } else {
      nextSession = 'Working hours have ended. Next session starts tomorrow at 9:00 AM';
    }
    
    return {
      isValid: false,
      session: 'OUTSIDE',
      timeInfo: nextSession,
      reason: `Cannot mark attendance outside working hours. ${nextSession}`,
    };
  }
  
  private checkLocation(
    userPosition: LatLng,
    departmentId: string
  ): {
    isInsideIIT: boolean;
    isInsideDepartment: boolean;
    userLocation: string;
    distance?: number;
  } {
    const iitDistance = this.calculateDistance(userPosition, IIT_GUWAHATI_LOCATION.center);
    const isInsideIIT = iitDistance <= IIT_GUWAHATI_LOCATION.radius;
    
    if (!isInsideIIT) {
      return {
        isInsideIIT: false,
        isInsideDepartment: false,
        userLocation: 'Outside IIT Guwahati',
        distance: Math.round(iitDistance),
      };
    }
    
    const department = getDepartmentLocation(departmentId);
    if (!department) {
      return {
        isInsideIIT: true,
        isInsideDepartment: false,
        userLocation: 'Inside IIT (Department not found)',
      };
    }
    
    const deptDistance = this.calculateDistance(userPosition, department.center);
    const isInsideDepartment = deptDistance <= department.radius;
    
    return {
      isInsideIIT: true,
      isInsideDepartment,
      userLocation: isInsideDepartment 
        ? department.label 
        : 'Inside IIT (Outside Department)',
      distance: Math.round(deptDistance),
    };
  }
  
  private calculateDistance(point1: LatLng, point2: LatLng): number {
    const R = 6371000;
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    
    const dLat = toRad(point2.lat - point1.lat);
    const dLng = toRad(point2.lng - point1.lng);
    
    const a = 
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(point1.lat)) * 
      Math.cos(toRad(point2.lat)) * 
      Math.sin(dLng / 2) ** 2;
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
  
  getLocationStatus(
    userPosition: LatLng,
    departmentId: string,
    userLocationType: 'CAMPUS' | 'FIELDTRIP' | null
  ): string {
    if (userLocationType === 'FIELDTRIP') {
      return 'Outside IIT (Field Trip)';
    }
    
    const locationCheck = this.checkLocation(userPosition, departmentId);
    return locationCheck.userLocation;
  }
  
  getCurrentSession(): 'FORENOON' | 'AFTERNOON' | 'OUTSIDE' {
    const check = this.checkWorkingHours();
    return check.session;
  }
  
  isWithinWorkingHours(): boolean {
    const check = this.checkWorkingHours();
    return check.isValid;
  }
  
  private cleanCache(): void {
    const now = Date.now();
    for (const [key, value] of this.validationCache.entries()) {
      if (now - value.timestamp > this.CACHE_DURATION) {
        this.validationCache.delete(key);
      }
    }
  }
  
  clearCache(): void {
    this.validationCache.clear();
  }
}

export const validationService = ValidationService.getInstance();
