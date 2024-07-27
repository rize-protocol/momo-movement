module momo_movement::role {
    use std::signer;
    use aptos_std::table_with_length;
    use aptos_std::table_with_length::TableWithLength;
    use aptos_framework::event::{Self, EventHandle};
    use aptos_framework::account;

    // error codes
    const E_NOT_ADMIN: u64 = 1;
    const E_NOT_COLLECTOR: u64 = 2;
    const E_NOT_PENDING_ADMIN: u64 = 3;
    const E_NOT_OPERATOR: u64 = 4;
    const E_ALREADY_OPERATOR: u64 = 5;

    const ZERO_ADDRESS: address = @0x0;

    struct Role has key {
        admin: address,
        pending_admin: address,
        operator_list: TableWithLength<address, bool>,

        transfer_admin_events: EventHandle<address>,
        accept_admin_events: EventHandle<address>,
        add_operator_events: EventHandle<address>,
        remove_operator_events: EventHandle<address>,
    }

    fun init_module(sender: &signer) {
        let sender_addr = signer::address_of(sender);

        let operator_list = table_with_length::new<address, bool>();
        table_with_length::add(&mut operator_list, sender_addr, true);

        move_to(sender, Role {
            admin: sender_addr,
            pending_admin: ZERO_ADDRESS,
            operator_list,

            transfer_admin_events: account::new_event_handle(sender),
            accept_admin_events: account::new_event_handle(sender),
            add_operator_events: account::new_event_handle(sender),
            remove_operator_events: account::new_event_handle(sender),
        });
    }

    /// pending admin role check
    fun only_pending_admin(sender: &signer) acquires Role {
        let role = borrow_global<Role>(@momo_movement);
        let sender_addr = signer::address_of(sender);
        assert!(sender_addr == role.pending_admin, E_NOT_PENDING_ADMIN);
    }

    /// admin role check
    public fun only_admin(sender: &signer) acquires Role {
        let role = borrow_global<Role>(@momo_movement);
        let sender_addr = signer::address_of(sender);
        assert!(sender_addr == role.admin, E_NOT_ADMIN);
    }

    /// transfer admin, only admin can do this
    /// after transfer, the new admin need to accept the admin role
    public entry fun transfer_admin(sender: &signer, new_admin: address) acquires Role {
        only_admin(sender);
        let role = borrow_global_mut<Role>(@momo_movement);
        role.pending_admin = new_admin;
        event::emit_event(&mut role.transfer_admin_events, role.pending_admin);
    }

    /// accept admin, only pending admin can do this
    public entry fun accept_admin(sender: &signer) acquires Role {
        only_pending_admin(sender);
        let role = borrow_global_mut<Role>(@momo_movement);
        role.admin = role.pending_admin;
        role.pending_admin = ZERO_ADDRESS;
        event::emit_event(&mut role.accept_admin_events, role.admin);
    }

    public entry fun add_operator(sender: &signer, operator: address) acquires Role {
        only_admin(sender);
        assert!(!is_operator(operator), E_ALREADY_OPERATOR);

        let role = borrow_global_mut<Role>(@momo_movement);
        table_with_length::add(&mut role.operator_list, operator, true);
        event::emit_event(&mut role.add_operator_events, operator);
    }

    public entry fun remove_operator(sender: &signer, operator: address) acquires Role {
        only_admin(sender);
        assert!(is_operator(operator), E_NOT_OPERATOR);

        let role = borrow_global_mut<Role>(@momo_movement);
        table_with_length::remove(&mut role.operator_list, operator);
        event::emit_event(&mut role.remove_operator_events, operator);
    }

    public fun only_operator(sender: &signer) acquires Role {
        assert!(is_operator(signer::address_of(sender)), E_NOT_OPERATOR);
    }

    public fun is_operator(account: address): bool acquires Role {
        let role = borrow_global<Role>(@momo_movement);
        table_with_length::contains(&role.operator_list, account)
    }

    /// get pending admin address
    public fun get_pending_admin(): address acquires Role {
        let role = borrow_global<Role>(@momo_movement);
        role.pending_admin
    }

    /// get admin address
    public fun get_admin(): address acquires Role {
        let role = borrow_global<Role>(@momo_movement);
        role.admin
    }

    #[test(deployer = @momo_movement)]
    fun test_init(deployer: signer) acquires Role {
        init_for_testing(&deployer);
        assert!(get_admin() == signer::address_of(&deployer), 0);
    }

    #[test(deployer = @momo_movement, admin = @test_admin)]
    fun test_transfer_admin(deployer: signer, admin: signer) acquires Role {
        init_for_testing(&deployer);
        let old_admin = signer::address_of(&deployer);
        let new_admin = signer::address_of(&admin);
        transfer_admin(&deployer, new_admin);
        assert!(get_admin() == old_admin, 0);
        assert!(get_pending_admin() == new_admin, 0);
        accept_admin(&admin);
        assert!(get_admin() == new_admin, 0);
        assert!(get_pending_admin() == ZERO_ADDRESS, 0);
    }

    // test transfer admin by attacker
    #[test(deployer = @momo_movement, attacker = @test_attacker)]
    #[expected_failure(abort_code = E_NOT_ADMIN)]
    fun test_transfer_admin_by_attacker(deployer: signer, attacker: signer) acquires Role {
        init_for_testing(&deployer);
        transfer_admin(&attacker, @test_admin);
    }

    // test accpet admin by attacker
    #[test(deployer = @momo_movement, attacker = @test_attacker)]
    #[expected_failure(abort_code = E_NOT_PENDING_ADMIN)]
    fun test_accept_admin_by_attacker(deployer: signer, attacker: signer) acquires Role {
        init_for_testing(&deployer);
        transfer_admin(&deployer, @test_admin);
        accept_admin(&attacker);
    }

    #[test(deployer = @momo_movement, attacker = @test_attacker)]
    #[expected_failure(abort_code = E_NOT_ADMIN)]
    fun test_only_admin(deployer: signer, attacker: signer) acquires Role {
        init_for_testing(&deployer);
        only_admin(&attacker);
    }

    #[test(deployer = @momo_movement, attacker = @test_attacker)]
    #[expected_failure(abort_code = E_NOT_PENDING_ADMIN)]
    fun test_only_pending_admin(deployer: signer, attacker: signer) acquires Role {
        init_for_testing(&deployer);
        only_pending_admin(&attacker);
    }

    #[test(deployer = @momo_movement, operator1 = @test_operator, operator2 = @test_attacker)]
    fun test_add_and_remove_operator(deployer: signer, operator1: address, operator2: address) acquires Role {
        init_for_testing(&deployer);
        let deployer_address = signer::address_of(&deployer);

        let is_operator1= is_operator(operator1);
        assert!(!is_operator1, 0);
        let is_operator2= is_operator(operator2);
        assert!(!is_operator2, 1);
        let is_operator3= is_operator(deployer_address);
        assert!(is_operator3, 2);

        add_operator(&deployer, operator1);
        add_operator(&deployer, operator2);

        is_operator1 = is_operator(operator1);
        assert!(is_operator1, 3);
        is_operator2 = is_operator(operator2);
        assert!(is_operator2, 4);
        is_operator3 = is_operator(deployer_address);
        assert!(is_operator3, 5);

        remove_operator(&deployer, operator1);

        is_operator1= is_operator(operator1);
        assert!(!is_operator1, 6);
    }

    #[test_only]
    public fun init_for_testing(s: &signer) {
        if (!account::exists_at(signer::address_of(s))) {
            account::create_account_for_test(signer::address_of(s));
        };
        init_module(s)
    }
}