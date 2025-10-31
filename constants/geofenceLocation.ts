import { GeofenceLocation } from "@/types/geofence";

export const IIT_GUWAHATI_LOCATION: GeofenceLocation = {
  id: "iit-guwahati",
  label: "IIT Guwahati",
  center: {
    lat: 26.1923,
    lng: 91.6951,
  },
  radius: 1200,
};

export const DEPARTMENTS: GeofenceLocation[] = [
  {
    id: "Dept1",
    label: "Biosciences & Bioengineering",
    center: {
      lat: 26.18535,
      lng: 91.69221,
    },
    radius: 200,
  },
  {
    id: "Dep2",
    label: "Chemical Engineering",
    center: {
      lat: 26.18507,
      lng: 91.69082,
    },
    radius: 200,
  },
  {
    id: "Dept3",
    label: "Computer Science and Engineering",
    center: {
      lat: 26.18695,
      lng: 91.69222,
    },
    radius: 200,
  },
  {
    id: "Dept4",
    label: "Civil Engineering",
    center: {
      lat: 26.18471,
      lng: 91.69218,
    },
    radius: 200,
  },
  {
    id: "Dept5",
    label: "Mechanical Engineering",
    center: {
      lat: 26.18794,
      lng: 91.69113,
    },
    radius: 200,
  },
  {
    id: "Dept6",
    label: "Physics",
    center: {
      lat: 26.18468,
      lng: 91.69102,
    },
    radius: 200,
  },
  {
    id: "Dept7",
    label: "Design",
    center: {
      lat: 26.18772,
      lng: 91.6922,
    },
    radius: 200,
  },
  {
    id: "Dept8",
    label: "Chemistry",
    center: {
      lat: 26.18592,
      lng: 91.69238,
    },
    radius: 200,
  },
  {
    id: "Dept9",
    label: "Mathematics",
    center: {
      lat: 26.18695,
      lng: 91.69083,
    },
    radius: 200,
  },
  {
    id: "Dept10",
    label: "Centre for Educational Technology",
    center: {
      lat: 26.18734,
      lng: 91.69226,
    },
    radius: 200,
  },
  {
    id: "Dept11",
    label: "Center for Computer and Communication",
    center: {
      lat: 26.18928,
      lng: 91.69296,
    },
    radius: 200,
  },
  {
    id: "Dept12",
    label: "Centre for Nanotechnology",
    center: {
      lat: 26.18682,
      lng: 91.68906,
    },
    radius: 200,
  },
  {
    id: "Dept13",
    label: "Center for Environment",
    center: {
      lat: 26.18602,
      lng: 91.69099,
    },
    radius: 200,
  },
  {
    id: "Dept14",
    label: "Centre for Energy",
    center: {
      lat: 26.18537,
      lng: 91.6908,
    },
    radius: 200,
  },
  {
    id: "Dept15",
    label: "Humanities and Social Sciences",
    center: {
      lat: 26.18656,
      lng: 91.69108,
    },
    radius: 200,
  },
  {
    id: "Dept16",
    label: "Research and Development",
    center: {
      lat: 26.18509,
      lng: 91.68933,
    },
    radius: 200,
  },
  {
    id: "Dept17",
    label: "Electronics and Electrical Engineering",
    center: {
      lat: 26.18653,
      lng: 91.68933,
    },
    radius: 200,
  },
  {
    id: "Dept18",
    label: "Centre for Linguistic Science and Technology",
    center: {
      lat: 26.18926,
      lng: 91.69293,
    },
    radius: 200,
  },
  {
    id: "Dept19",
    label: "Technology Incubation Center",
    center: {
      lat: 26.19321,
      lng: 91.70257,
    },
    radius: 200,
  },
  {
    id: "Dept20",
    label: "Industrial Interactions and Special Initiatives",
    center: {
      lat: 26.18509,
      lng: 91.68933,
    },
    radius: 200,
  },
  {
    id: "Dept21",
    label: "Centre for Intelligent Cyber-Physical Systems",
    center: {
      lat: 26.18682,
      lng: 91.68906,
    },
    radius: 200,
  },
  {
    id: "Dept22",
    label: "School of Agro and Rural Technology",
    center: {
      lat: 26.18730,
      lng: 91.69267,
    },
    radius: 200,
  },
];

export const getDepartmentLocation = (
  departmentName: string
): GeofenceLocation | undefined => {
  return DEPARTMENTS.find((dept) => dept.label === departmentName);
};