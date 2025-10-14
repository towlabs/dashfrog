import {NewRestAPI} from "@/src/services/api/_helper";

const LabelsAPI = NewRestAPI(`api`);

export interface LabelsResponse {
  [labelName: string]: string[];
}

const Labels = {
  getAll: () => {
    return LabelsAPI.get<LabelsResponse>('labels');
  }
};

export { LabelsAPI, Labels };
