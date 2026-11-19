export function controllers(service) {
  return {
    list: t => (req, res) => res.json(service.list(t, req.user)),
    person: (req, res) => res.json(service.person(req.user, req.params.id)),
    create: method => (req, res) => res.status(201).json(service[method](req.user, req.body)),
    deassign: (req, res) => res.json(service.deassign(req.user, req.params.id, req.body)),
    events: (req, res) => res.json(service.events(req.user)),
    snapshot: (req, res) => res.json(service.snapshot(req.user, req.params.id)),
    workspace: (req, res) => {
      service.permit(req.user, 'workspace');
      res.json(service.scope(req.user));
    }
  };
}
